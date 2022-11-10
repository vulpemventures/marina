import { NetworkString } from 'marina-provider';
import { Account } from '../domain/account';
import { WalletRepository, AppRepository } from '../infrastructure/repository';
import { ChainSource } from './chainsource';

// subscriber manages the subscription for all the accounts
export class Subscriber {
    private chainSource: ChainSource | null = null;
    private masterBlindingKey: string | undefined;
    private subscribedAccounts = new Set<string>();

    constructor(private walletRepository: WalletRepository, private appRepository: AppRepository) { }

    async start() {
        const masterBlindingKey = await this.walletRepository.getMasterBlindingKey();
        if (!masterBlindingKey) throw new Error('Master blinding key not found');
        this.masterBlindingKey = masterBlindingKey;
        const chainSource = await this.appRepository.getChainSource();
        if (chainSource === null) {
            console.error('Chain source not found');
        }
        this.chainSource = chainSource;
        await this.subscribeAllAccounts();
        this.appRepository.onNetworkChanged(async (network: NetworkString) => {
            await this.unsubscribeAllAccounts();
            this.chainSource = await this.appRepository.getChainSource(network);
            await this.subscribeAllAccounts();
        });
    }

    async stop() {
        for (const name of this.subscribedAccounts) {
            await this.unsubscribeAccount(name);
        }
        this.subscribedAccounts.clear();
    }

    async subscribeAccount(name: string, force = false): Promise<void> {
        if (!force && this.subscribedAccounts.has(name)) return;
        if (force) await this.unsubscribeAccount(name);
        const network = await this.appRepository.getNetwork();
        if (!network) throw new Error('network selected not found');
        if (!this.chainSource) throw new Error('Chain source not found');

        const { [name]: details } = await this.walletRepository.getAccountDetails(name);
        if (!details) throw new Error('Account not found');
        const account = new Account({
            name,
            chainSource: this.chainSource,
            masterPublicKey: details.masterPublicKey,
            masterBlindingKey: this.masterBlindingKey!,
            walletRepository: this.walletRepository,
            network,
        });
        await account.subscribeAllScripts();
        this.subscribedAccounts.add(name);
    }

    async subscribeAllAccounts(): Promise<void> {
        const accountsDetails = await this.walletRepository.getAccountDetails();
        const network = await this.appRepository.getNetwork();
        if (!network) throw new Error('network selected not found');
        if (!this.chainSource) throw new Error('Chain source not found');
        const accounts = [];
        for (const [name, details] of Object.entries(accountsDetails)) {
            if (this.subscribedAccounts.has(name)) continue; // skip already subscribed accounts
            accounts.push(new Account({
                name,
                chainSource: this.chainSource,
                masterPublicKey: details.masterPublicKey,
                masterBlindingKey: this.masterBlindingKey!,
                walletRepository: this.walletRepository,
                network,
            }));
        }
        await Promise.allSettled(accounts.map(account => account.subscribeAllScripts())).then(results => {
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error('Error subscribing account', result.reason);
                }
            }
        });

        for (const account of accounts) {
            this.subscribedAccounts.add(account.name);
        }
    }


    async unsubscribeAccount(name: string): Promise<void> {
        if (!this.subscribedAccounts.has(name)) return;
        const { [name]: details } = await this.walletRepository.getAccountDetails(name);
        if (!details) throw new Error('Account not found');
        const network = await this.appRepository.getNetwork();
        if (!network) throw new Error('network selected not found');
        if (!this.chainSource) throw new Error('Chain source not found');
        const account = new Account({
            name,
            chainSource: this.chainSource,
            masterPublicKey: details.masterPublicKey,
            masterBlindingKey: this.masterBlindingKey!,
            walletRepository: this.walletRepository,
            network,
        });
        await account.unsubscribeAllScripts();
        this.subscribedAccounts.delete(name);
    }

    async unsubscribeAllAccounts(): Promise<void> {
        const accountsDetails = await this.walletRepository.getAccountDetails();
        const accounts = [];
        const network = await this.appRepository.getNetwork();
        if (!network) throw new Error('network selected not found');
        for (const [name, details] of Object.entries(accountsDetails)) {
            if (!this.subscribedAccounts.has(name)) continue; // skip already unsubscribed accounts
                if (!this.chainSource) continue;
                accounts.push(new Account({
                    name,
                    chainSource: this.chainSource,
                    masterPublicKey: details.masterPublicKey,
                    masterBlindingKey: this.masterBlindingKey!,
                    walletRepository: this.walletRepository,
                    network,
                }));
        }
        await Promise.all(accounts.map(account => account.unsubscribeAllScripts()));
        for (const account of accounts) {
            this.subscribedAccounts.delete(account.name);
        }
    }
}