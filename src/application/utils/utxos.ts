import {
  AddressInterface,
  getNetwork,
  IdentityInterface,
  NetworkString,
  UnblindedOutput,
  unblindOutput,
} from 'ldk';
import { address, networks, Transaction } from 'liquidjs-lib';
import { RawHex } from 'marina-provider';
import { RootReducerState } from '../../domain/common';
import { UnconfirmedOutput } from '../../domain/unconfirmed';
import { selectNetwork } from '../redux/selectors/app.selector';
import {
  selectAllAccounts,
  selectAllAccountsIDs,
  selectUtxos,
} from '../redux/selectors/wallet.selector';

export const toStringOutpoint = (outpoint: { txid: string; vout: number }): string => {
  return `${outpoint.txid}:${outpoint.vout}`;
};

// for each unconfirmed output get unblindData and return utxo
export const makeUnconfirmedUtxos = async (
  txHex: string,
  changeUtxos: UnconfirmedOutput[]
): Promise<UnblindedOutput[]> => {
  const unconfirmedUtxos: UnblindedOutput[] = [];
  const transaction = Transaction.fromHex(txHex);
  for (const { txid, vout, blindPrivKey } of changeUtxos) {
    const prevout = transaction.outs[vout];
    const utxo = await unblindOutput({ txid, vout, prevout }, blindPrivKey);
    unconfirmedUtxos.push(utxo);
  }
  return unconfirmedUtxos;
};

export interface UtxosFromTx {
  selectedUtxos: UnblindedOutput[];
  changeUtxos: UnconfirmedOutput[];
}

// given a signed tx hex, get selected utxos and change utxos
export const getUtxosFromTx = async (
  signedTxHex: RawHex,
  state: RootReducerState
): Promise<UtxosFromTx> => {
  const tx = Transaction.fromHex(signedTxHex);
  const txid = tx.getId();

  // get selected utxos used in this transaction:
  // - get all coins from marina
  // - iterate over all transaction inputs and check if is a coin of ours

  // get all coins from marina
  const coins = selectUtxos(...selectAllAccountsIDs(state))(state);

  // array to store all utxos selected in this transaction
  const selectedUtxos: UnblindedOutput[] = [];

  // find all inputs that are a coin of ours
  tx.ins.forEach((_in) => {
    const { hash, index } = _in; // txid and vout
    const txid = hash.slice().reverse().toString('hex');
    for (const coin of coins) {
      if (coin.txid === txid && coin.vout === index) {
        selectedUtxos.push(coin);
        break;
      }
    }
  });

  // get credit change utxos:
  // - get all addresses used by marina
  // - iterate over all transaction outputs and check if belongs to marina

  // array to store all utxos to be found
  const changeUtxos: UnconfirmedOutput[] = [];

  // get all marina addresses (from all accounts)
  let allAddresses: AddressInterface[] = [];
  for (const account of selectAllAccounts(state)) {
    const identity = await account.getWatchIdentity(selectNetwork(state));
    allAddresses = [...allAddresses, ...(await identity.getAddresses())];
  }

  // iterate over transaction outputs
  tx.outs.forEach((out, vout) => {
    try {
      // get address from output script
      const addressFromOutputScript = address.fromOutputScript(
        Buffer.from(out.script),
        networks[selectNetwork(state)]
      );
      // iterate over marina addresses
      for (const addr of allAddresses) {
        // get unconfidential address for addr
        const unconfidentialAddress = address.fromConfidential(
          addr.confidentialAddress
        ).unconfidentialAddress;
        // compare with address from output script
        if (
          addressFromOutputScript === unconfidentialAddress ||
          addressFromOutputScript === addr.confidentialAddress
        ) {
          changeUtxos.push({
            txid,
            vout,
            blindPrivKey: addr.blindingPrivateKey,
          });
          break;
        }
      }
    } catch (_) {
      // probably this output doesn't belong to us
    }
  });

  return {
    selectedUtxos,
    changeUtxos,
  };
};

export const getUtxosFromChangeAddresses = async (
  changeAddresses: string[],
  identities: IdentityInterface[],
  network: NetworkString,
  tx: RawHex
): Promise<UnconfirmedOutput[]> => {
  const changeUtxos: UnconfirmedOutput[] = [];
  if (changeAddresses && identities[0]) {
    const transaction = Transaction.fromHex(tx);
    const txid = transaction.getId();
    for (const addr of changeAddresses) {
      const changeOutputScript = address.toOutputScript(addr, getNetwork(network));
      const vout = transaction.outs.findIndex(
        (o: any) => o.script.toString() === changeOutputScript.toString()
      );
      if (vout !== -1 && transaction?.outs[vout]?.script) {
        const script = transaction.outs[vout].script.toString('hex');
        const blindPrivKey = await identities[0].getBlindingPrivateKey(script);
        changeUtxos.push({ txid, vout, blindPrivKey });
      }
    }
  }
  return changeUtxos;
};
