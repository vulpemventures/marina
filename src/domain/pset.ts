import type { AxiosResponse } from 'axios';
import axios from 'axios';
import type { UpdaterInput, UpdaterOutput } from 'liquidjs-lib';
import { Pset, payments, Creator, networks, address, Updater, Transaction } from 'liquidjs-lib';
import { ScriptType, getScriptType } from 'liquidjs-lib/src/address';
import { varuint, varSliceSize } from 'liquidjs-lib/src/bufferutils';
import type { UnblindingData, AddressRecipient, DataRecipient, AccountID } from 'marina-provider';
import {
  MainAccount,
  MainAccountLegacy,
  MainAccountTest,
  AccountFactory,
} from '../application/account';
import type { WalletRepository, AppRepository, TaxiRepository } from './repository';
import type { CoinSelection } from './transaction';

function estimateScriptSigSize(type: ScriptType): number {
  switch (type) {
    case ScriptType.P2Pkh:
      return 108;
    case (ScriptType.P2Sh, ScriptType.P2Wsh):
      return 35;
    case (ScriptType.P2Wsh, ScriptType.P2Tr, ScriptType.P2Wpkh):
      return 1;
  }
  return 0;
}

const INPUT_BASE_SIZE = 40; // 32 bytes for outpoint, 4 bytes for sequence, 4 for index
const UNCONFIDENTIAL_OUTPUT_SIZE = 33 + 9 + 1 + 1; // 33 bytes for value, 9 bytes for asset, 1 byte for nonce, 1 byte for script length

function txBaseSize(inScriptSigsSize: number[], outNonWitnessesSize: number[]): number {
  const inSize = inScriptSigsSize.reduce((a, b) => a + b + INPUT_BASE_SIZE, 0);
  const outSize = outNonWitnessesSize.reduce((a, b) => a + b, 0);
  return (
    9 +
    varuint.encodingLength(inScriptSigsSize.length) +
    inSize +
    varuint.encodingLength(outNonWitnessesSize.length + 1) +
    outSize
  );
}

function txWitnessSize(inWitnessesSize: number[], outWitnessesSize: number[]): number {
  const inSize = inWitnessesSize.reduce((a, b) => a + b, 0);
  const outSize = outWitnessesSize.reduce((a, b) => a + b, 0) + 1 + 1; // add the size of proof for unconf fee output
  return inSize + outSize;
}

// estimate pset virtual size after signing, take confidential outputs into account
// aims to estimate the fee amount needed to be paid before blinding or signing the pset
function estimateVirtualSize(pset: Pset, withFeeOutput: boolean): number {
  const inScriptSigsSize = [];
  const inWitnessesSize = [];
  for (const input of pset.inputs) {
    const utxo = input.getUtxo();
    if (!utxo) throw new Error('missing input utxo, cannot estimate pset virtual size');
    const type = getScriptType(utxo.script);
    const scriptSigSize = estimateScriptSigSize(type);
    let witnessSize = 1 + 1 + 1; // add no issuance proof + no token proof + no pegin
    if (input.redeemScript) {
      // get multisig
      witnessSize += varSliceSize(input.redeemScript);
      const pay = payments.p2ms({ output: input.redeemScript });
      if (pay && pay.m) {
        witnessSize += pay.m * 75 + pay.m - 1;
      }
    } else {
      // len + witness[sig, pubkey]
      witnessSize += 1 + 107;
    }
    inScriptSigsSize.push(scriptSigSize);
    inWitnessesSize.push(witnessSize);
  }

  const outSizes = [];
  const outWitnessesSize = [];
  for (const output of pset.outputs) {
    let outSize = 33 + 9 + 1; // asset + value + empty nonce
    let witnessSize = 1 + 1; // no rangeproof + no surjectionproof
    if (output.needsBlinding()) {
      outSize = 33 + 33 + 33; // asset commitment + value commitment + nonce
      witnessSize = 3 + 4174 + 1 + 131; // rangeproof + surjectionproof + their sizes
    }
    outSizes.push(outSize);
    outWitnessesSize.push(witnessSize);
  }

  if (withFeeOutput) {
    outSizes.push(UNCONFIDENTIAL_OUTPUT_SIZE);
    outWitnessesSize.push(1 + 1); // no rangeproof + no surjectionproof
  }

  const baseSize = txBaseSize(inScriptSigsSize, outSizes);
  const sizeWithWitness = baseSize + txWitnessSize(inWitnessesSize, outWitnessesSize);
  const weight = baseSize * 3 + sizeWithWitness;
  return (weight + 3) / 4;
}

type PsetWithFee = {
  pset: Pset;
  feeAmount: number; // fee amount in satoshi
};

interface Topup {
  partial: string;
  topupId: string;
}

type RawTopupWithAssetData = {
  assetHash: string;
  assetAmount: string;
  assetSpread: string;
  expiry: string;
  inBlindingData: Array<{
    asset: string;
    value: string;
    assetBlinder: string;
    valueBlinder: string;
  }>;
  topup: {
    topupId: string;
    partial: string;
  };
};

export interface TopupWithAssetReply {
  assetAmount: number;
  assetHash: string;
  assetSpread: number;
  expiry: number;
  inBlindingData: Array<UnblindingData>;
  topup: Topup;
}

function castTopupData(raw: RawTopupWithAssetData): TopupWithAssetReply {
  return {
    assetAmount: Number(raw.assetAmount),
    assetHash: raw.assetHash,
    assetSpread: Number(raw.assetSpread),
    expiry: Number(raw.expiry),
    inBlindingData: raw.inBlindingData.map((data) => ({
      asset: data.asset,
      value: parseInt(data.value, 10),
      assetBlindingFactor: Buffer.from(data.assetBlinder, 'base64').reverse().toString('hex'),
      valueBlindingFactor: Buffer.from(data.valueBlinder, 'base64').reverse().toString('hex'),
    })),
    topup: {
      topupId: raw.topup.topupId,
      partial: raw.topup.partial,
    },
  };
}

async function fetchTaxiTopup(
  taxiUrl: string,
  params: { assetHash: string; estimatedTxSize: number; millisatPerByte: number }
): Promise<TopupWithAssetReply> {
  const { data } = await axios.post<any, AxiosResponse<RawTopupWithAssetData>>(
    `${taxiUrl}/asset/topup`,
    params
  );
  return castTopupData(data);
}

// This class is responsible for creating psets
// It selects utxos from WalletRepository but do not handle locking them
export class PsetBuilder {
  constructor(
    private walletRepository: WalletRepository,
    private appRepository: AppRepository,
    private taxiRepository: TaxiRepository
  ) {}

  async createRegularPset(
    recipients: AddressRecipient[],
    dataRecipients: DataRecipient[],
    fromAccounts: AccountID[] = [MainAccount, MainAccountLegacy, MainAccountTest]
  ): Promise<PsetWithFee> {
    const pset = Creator.newPset();
    const network = await this.appRepository.getNetwork();
    if (!network) {
      throw new Error('network not set');
    }
    const feeAssetHash = networks[network].assetHash;

    const coinSelection = await this.walletRepository.selectUtxos(
      network,
      [...recipients, ...dataRecipients]
        .filter(({ value }) => value > 0)
        .map(({ asset, value }) => ({ asset, amount: value })),
      undefined,
      ...fromAccounts
    );

    const { ins, outs } = await this.createUpdaterInsOuts(
      coinSelection,
      recipients,
      dataRecipients
    );
    const changeOutputsStartIndex = outs.length;

    // add the changes outputs
    if (coinSelection.changeOutputs && coinSelection.changeOutputs.length > 0) {
      const accountFactory = await AccountFactory.create(this.walletRepository);
      const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
      const mainAccount = await accountFactory.make(network, accountName);

      for (const { asset, amount } of coinSelection.changeOutputs) {
        const { confidentialAddress: changeAddress } = await mainAccount.getNextAddress(true);
        if (!changeAddress) {
          throw new Error('change address not found');
        }

        outs.push({
          asset,
          amount,
          script: address.toOutputScript(changeAddress, networks[network]),
          blinderIndex: 0,
          blindingPublicKey: address.fromConfidential(changeAddress).blindingKey,
        });
      }
    }

    const chainSource = await this.appRepository.getChainSource(network);
    if (!chainSource) {
      throw new Error('chain source not found, cannot estimate fee');
    }
    const updater = new Updater(pset).addInputs(ins).addOutputs(outs);
    // we add 50% to the min relay fee in order to be sure that the transaction will be accepted by the network
    // some inputs and outputs may be added later to pay the fees
    const relayFee = (await chainSource.getRelayFee()) * 1.5;
    await chainSource.close();

    const sats1000Bytes = relayFee * 10 ** 8;
    const estimatedSize = estimateVirtualSize(updater.pset, true);
    let feeAmount = Math.ceil(estimatedSize * (sats1000Bytes / 1000));

    const newIns = [];
    const newOuts = [];

    // check if one of the change outputs can cover the fees
    const onlyChangeOuts = outs.slice(changeOutputsStartIndex);
    const lbtcChangeOutputIndex = onlyChangeOuts.findIndex(
      (out) => out.asset === feeAssetHash && out.amount >= feeAmount
    );

    if (lbtcChangeOutputIndex !== -1) {
      pset.outputs[changeOutputsStartIndex + lbtcChangeOutputIndex].value -= feeAmount;
      // add the fee output
      updater.addOutputs([
        {
          asset: feeAssetHash,
          amount: feeAmount,
        },
      ]);
    } else {
      // reselect utxos to pay the fees
      const newCoinSelection = await this.walletRepository.selectUtxos(
        network,
        [{ asset: networks[network].assetHash, amount: feeAmount }],
        // exclude the already selected utxos used in the pset inputs
        updater.pset.inputs.map((input) => ({
          txID: Buffer.from(input.previousTxid).reverse().toString('hex'),
          vout: input.previousTxIndex,
        })),
        ...fromAccounts
      );

      const newWitnessUtxos = await Promise.all(
        newCoinSelection.utxos.map((utxo) => {
          return this.walletRepository.getWitnessUtxo(utxo.txID, utxo.vout);
        })
      );

      newIns.push(
        ...newCoinSelection.utxos.map((utxo, i) => ({
          txid: utxo.txID,
          txIndex: utxo.vout,
          sighashType: Transaction.SIGHASH_ALL,
          witnessUtxo: newWitnessUtxos[i],
        }))
      );

      if (newCoinSelection.changeOutputs && newCoinSelection.changeOutputs.length > 0) {
        const accountFactory = await AccountFactory.create(this.walletRepository);
        const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
        const mainAccount = await accountFactory.make(network, accountName);
        const { confidentialAddress: changeAddress } = await mainAccount.getNextAddress(true);
        if (!changeAddress) {
          throw new Error('change address not found');
        }
        newOuts.push({
          asset: newCoinSelection.changeOutputs[0].asset,
          amount: newCoinSelection.changeOutputs[0].amount,
          script: address.toOutputScript(changeAddress, networks[network]),
          blinderIndex: 0,
          blindingPublicKey: address.fromConfidential(changeAddress).blindingKey,
        });

        const outputIndex = pset.globals.outputCount;

        // reversing the array ensures that the fee output is the last one for consistency
        newOuts.reverse();
        updater.addInputs(newIns).addOutputs(newOuts);

        // re-estimate the size with new selection
        const estimatedSize = estimateVirtualSize(updater.pset, true);
        const newfeeAmount = Math.ceil(estimatedSize * (sats1000Bytes / 1000));

        const diff = newfeeAmount - feeAmount;

        // deduce from change output if possible
        if (pset.outputs[outputIndex].value > diff) {
          pset.outputs[outputIndex].value -= diff;
          feeAmount = newfeeAmount;
        } else {
          // if change cannot cover the fee, remove it and add it to the fee output
          feeAmount += pset.outputs[outputIndex].value;
          pset.outputs.splice(outputIndex, 1);
        }

        // add the fee output
        updater.addOutputs([
          {
            asset: feeAssetHash,
            amount: feeAmount,
          },
        ]);
      }
    }

    return {
      pset: updater.pset,
      feeAmount,
    };
  }

  async createTaxiPset(
    taxiAsset: string,
    recipients: AddressRecipient[],
    dataRecipients: DataRecipient[],
    fromAccounts: AccountID[] = [MainAccount, MainAccountLegacy, MainAccountTest]
  ): Promise<PsetWithFee> {
    const network = await this.appRepository.getNetwork();
    if (!network) throw new Error('network not found');
    const taxiURL = await this.taxiRepository.getTaxiURL(network);

    // first coin select in order to estimate the tx size
    const firstCoinSelection = await this.walletRepository.selectUtxos(
      network,
      [...recipients, ...dataRecipients]
        .filter(({ value }) => value > 0)
        .map(({ asset, value }) => ({
          asset,
          amount: value,
        })),
      undefined,
      ...fromAccounts
    );

    const updaterData = await this.createUpdaterInsOuts(
      firstCoinSelection,
      recipients,
      dataRecipients
    );
    const psetForEstimation = new Updater(Creator.newPset({}))
      .addInputs(updaterData.ins)
      .addOutputs(updaterData.outs).pset;
    const size = estimateVirtualSize(psetForEstimation, true);
    let feeRate = 120;
    const chainSource = await this.appRepository.getChainSource(network);
    if (chainSource) {
      feeRate = await chainSource.getRelayFee();
      await chainSource.close();
    }

    const { topup, assetAmount, inBlindingData } = await fetchTaxiTopup(taxiURL, {
      assetHash: taxiAsset,
      estimatedTxSize: Math.ceil(size),
      millisatPerByte: feeRate * 10 ** 8,
    });
    if (!topup) throw new Error('taxi topup not found');

    const pset = Pset.fromBase64(topup.partial);
    // we'll need this to persist the taxi blinding data in wallet repository
    const outpointsToBlindingData: [
      {
        txID: string;
        vout: number;
      },
      UnblindingData
    ][] = [];
    for (const [index, input] of pset.inputs.entries()) {
      outpointsToBlindingData.push([
        {
          txID: Buffer.from(input.previousTxid).reverse().toString('hex'),
          vout: input.previousTxIndex,
        },
        inBlindingData[index],
      ]);
    }

    const coinSelection = await this.walletRepository.selectUtxos(
      network,
      [...recipients, ...dataRecipients, { asset: taxiAsset, value: assetAmount }]
        .filter(({ value }) => value > 0)
        .map(({ asset, value }) => ({ asset, amount: value })),
      undefined,
      ...fromAccounts
    );

    const { ins, outs } = await this.createUpdaterInsOuts(
      coinSelection,
      recipients,
      dataRecipients
    );

    if (coinSelection.changeOutputs && coinSelection.changeOutputs.length > 0) {
      const accountFactory = await AccountFactory.create(this.walletRepository);
      const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
      const mainAccount = await accountFactory.make(network, accountName);
      for (const changeOutput of coinSelection.changeOutputs) {
        const { confidentialAddress: changeAddress } = await mainAccount.getNextAddress(true);
        if (!changeAddress) {
          throw new Error('change address not found');
        }
        outs.push({
          asset: changeOutput.asset,
          amount: changeOutput.amount,
          script: address.toOutputScript(changeAddress, networks[network]),
          blinderIndex: 0,
          blindingPublicKey: address.fromConfidential(changeAddress).blindingKey,
        });
      }
    }

    const updater = new Updater(pset);
    updater.addInputs(ins).addOutputs(outs);

    // store the blinding data of the taxi inputs
    await this.walletRepository.updateOutpointBlindingData(outpointsToBlindingData);
    return { pset: updater.pset, feeAmount: assetAmount };
  }

  private async createUpdaterInsOuts(
    coinSelection: CoinSelection,
    recipients: AddressRecipient[],
    dataRecipients: DataRecipient[]
  ) {
    const ins: UpdaterInput[] = [];
    const outs: UpdaterOutput[] = [];

    // get the witness utxos from repository
    const utxosWitnessUtxos = await Promise.all(
      coinSelection.utxos.map((utxo) => {
        return this.walletRepository.getWitnessUtxo(utxo.txID, utxo.vout);
      })
    );

    ins.push(
      ...coinSelection.utxos.map((utxo, i) => ({
        txid: utxo.txID,
        txIndex: utxo.vout,
        sighashType: Transaction.SIGHASH_ALL,
        witnessUtxo: utxosWitnessUtxos[i],
      }))
    );

    // add recipients
    for (const recipient of recipients) {
      const updaterOut: UpdaterOutput = {
        asset: recipient.asset,
        amount: recipient.value,
        script: address.toOutputScript(recipient.address),
      };
      if (address.isConfidential(recipient.address)) {
        updaterOut.blinderIndex = 0;
        updaterOut.blindingPublicKey = address.fromConfidential(recipient.address).blindingKey;
      }
      outs.push(updaterOut);
    }

    // add data (OP_RETURN) recipients
    for (const dataRecipient of dataRecipients) {
      const opReturnPayment = payments.embed({ data: [Buffer.from(dataRecipient.data, 'hex')] });
      const updaterOut: UpdaterOutput = {
        asset: dataRecipient.asset,
        amount: dataRecipient.value,
        script: opReturnPayment.output,
      };
      outs.push(updaterOut);
    }

    return { ins, outs };
  }
}
