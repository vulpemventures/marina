/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-constant-condition */
import axios from 'axios';
import { Thunk, IAppState, Action } from '../src/domain/common';
import { deriveNewAddress, setUtxos } from '../src/application/store/actions';
import { xpubWalletFromAddresses } from '../src/application/utils/restorer';
import { Address } from '../src/domain/wallet/value-objects';

const APIURL = process.env.EXPLORER || `http://localhost:3001`;

export function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUtxos(address: string, txid?: string): Promise<any> {
  try {
    let utxos = (await axios.get(`${APIURL}/address/${address}/utxo`)).data;
    if (txid) {
      utxos = utxos.filter((u: any) => u.txid === txid);
    }
    return utxos;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function faucet(address: string): Promise<any> {
  try {
    const { status, data } = await axios.post(`${APIURL}/faucet`, { address });
    if (status !== 200) {
      throw new Error('Invalid address');
    }
    const { txId } = data;

    while (true) {
      await sleep(1000);
      try {
        const utxos = await fetchUtxos(address, txId);
        if (utxos.length > 0) {
          return;
        }
      } catch (ignore) {}
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function fetchTxHex(txId: string): Promise<string> {
  try {
    return (await axios.get(`${APIURL}/tx/${txId}/hex`)).data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

/**
 * Mint
 * @param address
 * @param quantity
 * @param name
 * @param ticker
 * @returns mint data
 */
export async function mint(
  address: string,
  quantity: number,
  name?: string,
  ticker?: string,
  precision?: number
): Promise<{ asset: string; txid: string }> {
  try {
    const { status, data } = await axios.post(`${APIURL}/mint`, {
      address,
      quantity,
      name,
      ticker,
      precision,
    });
    if (status !== 200) {
      throw new Error('Invalid address');
    }
    await sleep(5000);
    return data;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function broadcastTx(hex: string): Promise<string> {
  try {
    return (await axios.post(`${APIURL}/tx`, hex)).data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export function populateWalletWithFakeTransactions(
  onSuccess?: () => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState) => {
    const { wallets } = getState();
    const firstWallet = wallets[0];
    const deriveNewAddressAction = function (): Promise<string> {
      return new Promise((resolve, reject) => {
        dispatch(
          deriveNewAddress(
            false,
            (confidentialAddress) => {
              resolve(confidentialAddress);
            },
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    try {
      //
      const confidentialAddr1 = await deriveNewAddressAction();
      const confidentialAddr2 = await deriveNewAddressAction();
      //
      const utxosAddr1 = await fetchUtxos(confidentialAddr1);
      const utxosAddr2 = await fetchUtxos(confidentialAddr2);
      //
      if (utxosAddr1.length < 3) {
        await mint(confidentialAddr1, 21, 'Liquid Bitcoin', 'L-BTC');
        await mint(confidentialAddr1, 996699, 'Vulpem', 'VLP');
        await mint(confidentialAddr1, 4200, 'Tether USD', 'USDt');
      }
      if (utxosAddr2.length < 1) {
        await mint(confidentialAddr2, 100, 'Sticker pack', 'STIKR');
      }
      //
      const w = await xpubWalletFromAddresses(
        firstWallet.masterXPub.value,
        firstWallet.masterBlindingKey.value,
        [Address.create(confidentialAddr1), Address.create(confidentialAddr2)],
        'regtest'
      );
      //
      dispatch(
        setUtxos(
          w.getAddresses().map((a) => ({
            confidentialAddress: a.confidentialAddress,
            blindingPrivateKey: a.blindingPrivateKey,
          })),
          () => onSuccess?.(),
          (error) => onError?.(error)
        )
      );
    } catch (error) {
      console.log(error.message);
    }
  };
}
