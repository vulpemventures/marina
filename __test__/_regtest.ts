import axios from 'axios';
// Nigiri Chopstick Liquid base URI
export const APIURL = process.env.EXPLORER || `http://localhost:3001`;

export function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUtxos(address: string, txid?: string): Promise<any> {
  let utxos: any = [];
  try {
    await sleep(3000);
    utxos = (await axios.get(`${APIURL}/address/${address}/utxo`)).data;
    if (txid) {
      utxos = utxos.filter((u: any) => u.txid === txid);
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
  return utxos;
}

export async function faucet(address: string): Promise<void> {
  try {
    await axios.post(`${APIURL}/faucet`, { address });
    await sleep(3000);
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function fetchTxHex(txId: string): Promise<string> {
  let hex: string;
  try {
    await sleep(3000);
    hex = (await axios.get(`${APIURL}/tx/${txId}/hex`)).data;
  } catch (e) {
    console.error(e);
    throw e;
  }
  return hex;
}

export async function mint(
  address: string,
  quantity: number
): Promise<{ asset: string; txid: string }> {
  let ret: any;
  try {
    const response = await axios.post(`${APIURL}/mint`, { address, quantity });
    await sleep(5000);
    ret = response.data;
  } catch (e) {
    console.error(e);
    throw e;
  }
  return ret;
}

export async function broadcastTx(hex: string): Promise<string> {
  try {
    const response = await axios.post(`${APIURL}/tx`, hex);
    await sleep(5000);
    return response.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
