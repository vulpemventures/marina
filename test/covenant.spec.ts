import type { AddressInterface } from 'ldk';
import {
  fetchAndUnblindUtxos,
  IdentityType,
  networks,
  Psbt,
  script,
  witnessStackToScriptWitness,
} from 'ldk';
import * as ecc from 'tiny-secp256k1';
import { blindAndSignPset, createSendPset } from '../src/application/utils/transaction';
import { CovenantIdentity } from '../src/domain/covenant-identity';
import { makeRandomMnemonic } from './test.utils';
import { APIURL, broadcastTx, faucet } from './_regtest';

const TEST_NAMESPACE = 'test';

jest.setTimeout(15000);

function makeRandomCovenantIdentity(template?: string, changeTemplate?: string): CovenantIdentity {
  const mnemo = makeRandomMnemonic();
  return new CovenantIdentity({
    type: IdentityType.Mnemonic,
    chain: 'regtest',
    opts: { mnemonic: mnemo.mnemonic, namespace: TEST_NAMESPACE, template, changeTemplate },
    ecclib: ecc,
  });
}

describe('covenant identity', () => {
  const getUnspents = async (addr: AddressInterface) => {
    return await fetchAndUnblindUtxos(ecc, [addr], APIURL);
  };

  test('should be able to instantiate a covenant identity without template set up', () => {
    const random = makeRandomCovenantIdentity();
    expect(random.covenant.namespace).toBe(TEST_NAMESPACE);
    expect(random.covenant.template).toBeUndefined();
    expect(random.covenant.changeTemplate).toBeUndefined();
  });

  test('should be able to send and receive coin with new elements tapscript opcodes', async () => {
    const inspectOutputIsLbtc = (index: number) => script.toASM([
      script.number.encode(index),
      script.OPS.OP_INSPECTOUTPUTASSET,
      script.number.encode(1), // 1 = UNCONFIDENTIAL
      script.OPS.OP_EQUALVERIFY,
      Buffer.from(networks.regtest.assetHash, 'hex').reverse(),
      script.OPS.OP_EQUALVERIFY
    ]);

    const covenantLeaf = `$${TEST_NAMESPACE} OP_CHECKSIG ${inspectOutputIsLbtc(2)}`;
    const template = `eltr(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5, { asm(${covenantLeaf}), asm(OP_FALSE) })`;
    const id = makeRandomCovenantIdentity(template);
    const addr = await id.getNextAddress();
    expect(addr.result.taprootHashTree).toBeDefined();
    const leafToSpendScript = addr.result.taprootHashTree?.left?.scriptHex;
    expect(leafToSpendScript).toBeDefined();

    await faucet(addr.confidentialAddress, 10000);
    const utxos = await getUnspents(addr);
    expect(utxos.length).toBeGreaterThanOrEqual(1);

    let pset = await createSendPset(
      [
        {
          address: addr.confidentialAddress,
          asset: networks.regtest.assetHash,
          value: 1000,
        },
      ],
      utxos,
      networks.regtest.assetHash,
      () => addr.confidentialAddress,
      'regtest'
    );

    pset = Psbt.fromBase64(pset)
      .updateInput(0, {
        finalScriptWitness: witnessStackToScriptWitness([Buffer.from(leafToSpendScript!, 'hex')]),
      })
      .toBase64();

    const signed = await blindAndSignPset(
      pset,
      utxos,
      [id],
      [addr.confidentialAddress],
      [addr.confidentialAddress],
      true
    );
    const txid = await broadcastTx(signed);
    expect(txid).toBeDefined();
  });
});
