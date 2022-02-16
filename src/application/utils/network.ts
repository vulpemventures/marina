// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios, { AxiosError } from 'axios';
import { networks, NetworkString } from 'ldk';
import { IAssets } from '../../domain/assets';
import { extractErrorMessage } from '../../presentation/utils/error';
import { TransactionID } from 'marina-provider';
import { marinaStore } from '../redux/store';
import { selectAllAccountsIDs } from '../redux/selectors/wallet.selector';
import { updateTaskAction } from '../redux/actions/updater';
import { AccountID } from '../../domain/account';
import { selectNetwork } from '../redux/selectors/app.selector';

export const broadcastTx = async (baseUrl: string, txHex: string): Promise<TransactionID> => {
  try {
    const response = await axios.post(`${baseUrl}/tx`, txHex);
    if (response.status !== 200) throw new Error(response.data);
    return response.data;
  } catch (error: unknown | AxiosError) {
    throw new Error(extractErrorMessage(error));
  }
};

export const lbtcAssetByNetwork = (net: NetworkString): string => {
  return networks[net].assetHash;
};

export const usdtAssetHash = (assets: IAssets): string | undefined => {
  return Object.entries(assets).find(([_, { ticker }]) => ticker === 'USDt')?.[0];
};

export const reloadCoins = () => {
  const state = marinaStore.getState();
  const network = selectNetwork(state);
  const allAccountsIds = selectAllAccountsIDs(state);
  const makeUpdateTaskForId = (id: AccountID) => updateTaskAction(id, network);
  allAccountsIds.map(makeUpdateTaskForId).map((x: any) => marinaStore.dispatch(x));
  return true;
};
