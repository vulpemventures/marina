import { AccountType, isIonioScriptDetails } from 'marina-provider';
import Browser from 'webextension-polyfill';
import { AccountFactory } from '../application/account';
import { loadFromBackupServices, makeBackupService } from '../application/backup';
import type { RestorationJSONDictionary } from '../domain/backup';
import type { AppRepository, WalletRepository } from '../domain/repository';

export class BackupSyncer {
  static ALARM = 'backup-syncer';

  private closeFn: () => Promise<void> = () => Promise.resolve();

  constructor(private appRepository: AppRepository, private walletRepository: WalletRepository) {}

  private async loadBackupData() {
    const backupConfigs = await this.appRepository.getBackupServiceConfigs();
    const backupServices = backupConfigs.map(makeBackupService);
    await loadFromBackupServices(this.appRepository, this.walletRepository, backupServices);
  }

  private async saveBackupData() {
    const restoration: RestorationJSONDictionary = {
      liquid: [],
      testnet: [],
      regtest: [],
    };
    const allAccounts = await this.walletRepository.getAccountDetails();
    const ionioAccounts = Object.values(allAccounts).filter(
      ({ type }) => type === AccountType.Ionio
    );
    const factory = await AccountFactory.create(this.walletRepository);

    for (const details of ionioAccounts) {
      for (const net of details.accountNetworks) {
        const account = await factory.make(net, details.accountID);
        const restorationJSON = await account.restorationJSON();
        restoration[net].push(restorationJSON);
      }
    }

    const backupConfigs = await this.appRepository.getBackupServiceConfigs();
    const backupServices = backupConfigs.map(makeBackupService);
    const results = await Promise.allSettled([
      ...backupServices.map((service) =>
        service.save({ ionioAccountsRestorationDictionary: restoration })
      ),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(result.reason);
      }
    }
  }

  async start() {
    this.closeFn = () => Promise.resolve();
    const closeFns: (() => void | Promise<void>)[] = [];

    // set up onNewScript & onNetworkChanged callbacks triggering backup saves
    closeFns.push(
      this.walletRepository.onNewScript(async (_, scriptDetails) => {
        if (isIonioScriptDetails(scriptDetails)) {
          await this.saveBackupData();
        }
      })
    );

    closeFns.push(
      this.appRepository.onNetworkChanged(async () => {
        await this.saveBackupData();
      })
    );

    // set up an alarm triggering backup loads
    Browser.alarms.create(BackupSyncer.ALARM, { periodInMinutes: 10 });
    Browser.alarms.onAlarm.addListener(async (alarm: Browser.Alarms.Alarm) => {
      if (alarm.name !== BackupSyncer.ALARM) return;
      await this.loadBackupData();
    });
    closeFns.push(async () => {
      await Browser.alarms.clear(BackupSyncer.ALARM);
    });

    this.closeFn = async () => {
      await Promise.all(closeFns.map((fn) => Promise.resolve(fn())));
    };
    await this.loadBackupData(); // load backup data on start
  }

  async stop() {
    await this.saveBackupData(); // save backup data on stop
    await this.closeFn();
  }
}
