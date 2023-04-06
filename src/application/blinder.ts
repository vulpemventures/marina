import * as ecc from 'tiny-secp256k1';
import type { OwnedInput } from 'liquidjs-lib';
import { AssetHash, Blinder, Pset, ZKPGenerator, ZKPValidator } from 'liquidjs-lib';
import type { WalletRepository } from '../domain/repository';
import type { ZKPInterface } from 'liquidjs-lib/src/confidential';

const keysGenerator = Pset.ECCKeysGenerator(ecc);
export class BlinderService {
  private zkpValidator: ZKPValidator;

  constructor(private walletRepository: WalletRepository, private zkpLib: ZKPInterface) {
    this.zkpValidator = new ZKPValidator(zkpLib);
  }

  async blindPset(pset: Pset): Promise<Pset> {
    const ownedInputs: OwnedInput[] = [];
    const inputsBlindingData = await this.walletRepository.getOutputBlindingData(
      ...pset.inputs.map(({ previousTxIndex, previousTxid }) => ({
        txID: Buffer.from(previousTxid).reverse().toString('hex'),
        vout: previousTxIndex,
      }))
    );
    for (const inputIndex of pset.inputs.keys()) {
      const unblindOutput = inputsBlindingData.at(inputIndex);
      if (!unblindOutput || !unblindOutput.blindingData) continue;
      ownedInputs.push({
        asset: AssetHash.fromHex(unblindOutput.blindingData.asset).bytesWithoutPrefix,
        assetBlindingFactor: Buffer.from(unblindOutput.blindingData.assetBlindingFactor, 'hex'),
        valueBlindingFactor: Buffer.from(unblindOutput.blindingData.valueBlindingFactor, 'hex'),
        value: unblindOutput.blindingData.value.toString(),
        index: inputIndex,
      });
    }

    const zkpGenerator = new ZKPGenerator(this.zkpLib, ZKPGenerator.WithOwnedInputs(ownedInputs));

    // find the output indexes to blind
    const outputIndexes = [];
    for (const [index, output] of pset.outputs.entries()) {
      if (output.blindingPubkey && output.blinderIndex) {
        outputIndexes.push(index);
      }
    }

    const outputBlindingArgs = zkpGenerator.blindOutputs(pset, keysGenerator, outputIndexes);
    const inputIndexes = ownedInputs.map((input) => input.index);
    let isLast = true;
    for (const out of pset.outputs) {
      if (out.isFullyBlinded()) continue;
      if (out.needsBlinding() && out.blinderIndex) {
        if (!inputIndexes.includes(out.blinderIndex)) {
          isLast = false;
          break;
          // if it remains an output to blind, it means that we are not the last blinder
        }
      }
    }

    const blinder = new Blinder(pset, ownedInputs, this.zkpValidator, zkpGenerator);
    if (isLast) {
      blinder.blindLast({ outputBlindingArgs });
    } else {
      blinder.blindNonLast({ outputBlindingArgs });
    }

    return blinder.pset;
  }
}
