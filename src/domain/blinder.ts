import * as ecc from 'tiny-secp256k1';
import type { OwnedInput } from 'liquidjs-lib';
import { AssetHash, Blinder, Pset, ZKPGenerator, ZKPValidator } from 'liquidjs-lib';
import type { WalletRepository } from '../infrastructure/repository';
import type { ZKPInterface } from 'liquidjs-lib/src/confidential';

const keysGenerator = Pset.ECCKeysGenerator(ecc);
export class BlinderService {
  private zkpValidator: ZKPValidator;

  constructor(private walletRepository: WalletRepository, private zkpLib: ZKPInterface) {
    this.zkpValidator = new ZKPValidator(zkpLib);
  }

  async blindPset(pset: Pset): Promise<Pset> {
    // find input index belonging to this account
    const inputsScripts = pset.inputs
      .map((input) => input.witnessUtxo?.script)
      .filter((script) => !!script);
    const scriptsDetails = await this.walletRepository.getScriptDetails(
      ...inputsScripts.map((script) => script!.toString('hex'))
    );

    const inputIndexes = [];
    for (let i = 0; i < pset.inputs.length; i++) {
      const input = pset.inputs[i];
      const script = input.witnessUtxo?.script;
      if (!script) continue;
      const scriptDetails = scriptsDetails[script.toString('hex')];
      if (scriptDetails) {
        inputIndexes.push(i);
      }
    }

    const ownedInputs: OwnedInput[] = [];
    for (const inputIndex of inputIndexes) {
      const input = pset.inputs[inputIndex];
      const unblindOutput = await this.walletRepository.getOutputBlindingData(
        Buffer.from(input.previousTxid).reverse().toString('hex'),
        input.previousTxIndex
      );

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
    const outputBlindingArgs = zkpGenerator.blindOutputs(pset, keysGenerator);

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
