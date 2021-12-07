import { decodePset, fetchAndUnblindUtxos, Mnemonic, networks } from 'ldk';
import { makeRandomMnemonic } from './test.utils';
import { APIURL, broadcastTx, faucet } from './_regtest';
import { blindAndSignPset, createSendPset } from '../src/application/utils/transaction';
import { payments, Transaction } from 'liquidjs-lib';

jest.setTimeout(15000);

const network = networks.regtest;

const RECEIVER = 'AzpofttCgtcfk1PDWytoocvMWqQnLUJfjZw6MVmSdJQtwWnovQPgqiWSRTFZmKub3BNEpLYkyrr4czSp';

describe('create send pset (build, blind & sign)', () => {
  const mnemonic: Mnemonic = makeRandomMnemonic();

  const makeUnspents = async () => {
    const addr = await mnemonic.getNextAddress();
    await faucet(addr.confidentialAddress, 10000);
    return fetchAndUnblindUtxos([addr], APIURL);
  };

  const makeChangeAddressGetter = async () => {
    const addr = (await mnemonic.getNextChangeAddress()).confidentialAddress;
    return () => addr;
  };

  const makeRecipients = (...args: Array<{ value: number }>) =>
    args.map(({ value }) => ({
      address: RECEIVER,
      asset: network.assetHash,
      value,
    }));

  const blindAndSign = (pset: string) => blindAndSignPset(mnemonic, pset, [RECEIVER]);

  test('should be able to create a regular transaction', async () => {
    const pset = await createSendPset(
      makeRecipients({ value: 100000 }, { value: 11000 }),
      await makeUnspents(),
      network.assetHash,
      await makeChangeAddressGetter(),
      'regtest'
    );

    const decoded = decodePset(pset);
    expect(decoded.data.outputs).toHaveLength(4); // recipients outputs (2) + fee output + change output
    expect(decoded.data.inputs).toHaveLength(1); // should select the faucet unspent

    const signed = await blindAndSign(pset);
    await broadcastTx(signed);
  });

  test('should be able to create a transaction with OP_RETURN data', async () => {
    const OP_RETURN_DATA = '6666666666666666';

    const pset = await createSendPset(
      makeRecipients({ value: 200 }),
      await makeUnspents(),
      network.assetHash,
      await makeChangeAddressGetter(),
      'regtest',
      [{ data: OP_RETURN_DATA, value: 120, asset: network.assetHash }]
    );

    const decoded = decodePset(pset);
    expect(decoded.data.outputs).toHaveLength(4); // recipient output + fee output + change output + OP_RETURN output
    expect(decoded.data.inputs).toHaveLength(1); // should select the faucet unspent

    const signed = await blindAndSign(pset);
    const signedTx = Transaction.fromHex(signed);
    const opReturnScript = payments
      .embed({ data: [Buffer.from(OP_RETURN_DATA, 'hex')], network })
      .output!.toString('hex');

    expect(signedTx.outs.map((o) => o.script.toString('hex'))).toContain(opReturnScript);

    await broadcastTx(signed);
  });
});
