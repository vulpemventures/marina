import { address, privateBlindKeyGetter } from 'ldk';
import type { BlindingKeyGetterAsync, NetworkString } from 'ldk';
import type { Store } from 'redux';
import { selectAllAccounts } from '../application/redux/selectors/wallet.selector';
import type { Account } from '../domain/account';

export interface BlockHeader {
  version: number;
  previousBlockHash: string;
  merkleRoot: string;
  timestamp: number;
  height: number;
}

const DYNAFED_HF_MASK = 2147483648;

export function deserializeBlockHeader(hex: string): BlockHeader {
  const buffer = Buffer.from(hex, 'hex');
  let offset = 0;

  let version = buffer.readUInt32LE(offset);
  offset += 4;

  const isDyna = (version & DYNAFED_HF_MASK) !== 0;
  if (isDyna) {
    version = version & ~DYNAFED_HF_MASK;
  }

  const previousBlockHash = buffer
    .subarray(offset, offset + 32)
    .reverse()
    .toString('hex');
  offset += 32;

  const merkleRoot = buffer.subarray(offset, offset + 32).toString('hex');
  offset += 32;

  const timestamp = buffer.readUInt32LE(offset);
  offset += 4;

  const height = buffer.readUInt32LE(offset);
  offset += 4;

  return {
    version,
    previousBlockHash,
    merkleRoot,
    timestamp,
    height,
  };
}

const makeGetPrivateBlindKey =
  (network: NetworkString) =>
  (account: Account): BlindingKeyGetterAsync =>
  async (script: string) => {
    const identity = await account.getWatchIdentity(network);
    return privateBlindKeyGetter(identity)(script);
  };

// select all accounts and create a global private blind key getter from them
export function getPrivateBlindKeyGetter(
  store: Store,
  network: NetworkString
): BlindingKeyGetterAsync {
  const accounts = selectAllAccounts(store.getState(), true);
  const getters = accounts.map(makeGetPrivateBlindKey(network));

  return async (script: string) => {
    try {
      for (const getter of getters) {
        try {
          const key = await getter(script);
          return key;
        } catch (e) {
          continue;
        }
      }
      throw new Error('No key able to unblind the script: ' + script);
    } catch (err) {
      console.error('getPrivateBlindKeyGetter', err);
      return undefined;
    }
  };
}

const getScripts = async (account: Account, network: NetworkString) => {
  const identity = await account.getWatchIdentity(network);
  const addresses = await identity.getAddresses();
  return addresses.map((a) => address.toOutputScript(a.confidentialAddress).toString('hex'));
};

// compute all the wallet scripts
export async function getAllWalletScripts(store: Store, network: NetworkString): Promise<string[]> {
  const accounts = selectAllAccounts(store.getState());
  const promises = accounts.map((a) => getScripts(a, network));
  const results = await Promise.all(promises);
  return results.flat();
}
