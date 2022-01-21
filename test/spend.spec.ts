import { decodePset, fetchAndUnblindUtxos, Mnemonic, networks, UnblindedOutput } from 'ldk';
import { makeRandomMnemonic } from './test.utils';
import { APIURL, broadcastTx, faucet } from './_regtest';
import { blindAndSignPset, createSendPset } from '../src/application/utils/transaction';
import { payments, Transaction } from 'liquidjs-lib';

jest.setTimeout(15000);

const network = networks.regtest;

const RECEIVER = 'AzpofttCgtcfk1PDWytoocvMWqQnLUJfjZw6MVmSdJQtwWnovQPgqiWSRTFZmKub3BNEpLYkyrr4czSp';

describe('create send pset (build, blind & sign)', () => {
  const mnemonic: Mnemonic = makeRandomMnemonic();
  const unspents: UnblindedOutput[] = [];

  const makeUnspents = async () => {
    const addr = await mnemonic.getNextAddress();
    await faucet(addr.confidentialAddress, 10000);
    const u = await fetchAndUnblindUtxos([addr], APIURL);
    unspents.push(...u);
    return u;
  };

  const makeChangeAddressGetter = async (): Promise<[string, () => string]> => {
    const addr = (await mnemonic.getNextChangeAddress()).confidentialAddress;
    return [addr, () => addr];
  };

  const makeRecipients = (...args: Array<{ value: number }>) =>
    args.map(({ value }) => ({
      address: RECEIVER,
      asset: network.assetHash,
      value,
    }));

  const blindAndSign = (pset: string, changeAddress: string) =>
    blindAndSignPset(pset, unspents, [mnemonic], [RECEIVER], [changeAddress]);

  test('should be able to create a regular transaction', async () => {
    const [changeAddress, getChangeAddress] = await makeChangeAddressGetter();

    const pset = await createSendPset(
      makeRecipients({ value: 100000 }, { value: 11000 }),
      await makeUnspents(),
      network.assetHash,
      getChangeAddress,
      'regtest'
    );

    const decoded = decodePset(pset);
    expect(decoded.data.outputs).toHaveLength(4); // recipients outputs (2) + fee output + change output
    expect(decoded.data.inputs).toHaveLength(1); // should select the faucet unspent

    const signed = await blindAndSign(pset, changeAddress);
    await broadcastTx(signed);
  });

  test('should be able to create a transaction with OP_RETURN data', async () => {
    const OP_RETURN_DATA = '6666666666666666';

    const [changeAddress, getChangeAddress] = await makeChangeAddressGetter();

    const pset = await createSendPset(
      makeRecipients({ value: 200 }),
      await makeUnspents(),
      network.assetHash,
      getChangeAddress,
      'regtest',
      [{ data: OP_RETURN_DATA, value: 120, asset: network.assetHash }]
    );

    const decoded = decodePset(pset);
    expect(decoded.data.outputs).toHaveLength(4); // recipient output + fee output + change output + OP_RETURN output
    expect(decoded.data.inputs).toHaveLength(1); // should select the faucet unspent

    const signed = await blindAndSign(pset, changeAddress);
    const signedTx = Transaction.fromHex(signed);
    const opReturnScript = payments
      .embed({ data: [Buffer.from(OP_RETURN_DATA, 'hex')], network })
      .output!.toString('hex');

    expect(signedTx.outs.map((o) => o.script.toString('hex'))).toContain(opReturnScript);

    await broadcastTx(signed);
  });
});
