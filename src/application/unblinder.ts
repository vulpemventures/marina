import * as ecc from 'tiny-secp256k1';
import { AssetHash, confidential } from 'liquidjs-lib';
import type { ZKPInterface } from 'liquidjs-lib/src/confidential';
import { confidentialValueToSatoshi } from 'liquidjs-lib/src/confidential';
import type { Output } from 'liquidjs-lib/src/transaction';
import { SLIP77Factory } from 'slip77';
import type { AppRepository, AssetRepository, WalletRepository } from '../domain/repository';
import type { UnblindingData } from '../domain/transaction';
import { assetIsUnknown, fetchAssetDetails } from './utils';

const slip77 = SLIP77Factory(ecc);

export interface Unblinder {
  unblind(...outputs: Output[]): Promise<(UnblindingData | Error)[]>;
}

export class WalletRepositoryUnblinder implements Unblinder {
  private lib: confidential.Confidential;

  constructor(
    private walletRepository: WalletRepository,
    private appRepository: AppRepository,
    private assetRepository: AssetRepository,
    zkpLib: ZKPInterface
  ) {
    this.lib = new confidential.Confidential(zkpLib);
  }

  async unblind(...outputs: Output[]): Promise<(UnblindingData | Error)[]> {
    const masterBlindingKey = await this.walletRepository.getMasterBlindingKey();
    if (!masterBlindingKey) throw new Error('Master blinding key not found');
    const slip77node = slip77.fromMasterBlindingKey(masterBlindingKey);

    const unblindingResults: (UnblindingData | Error)[] = [];

    for (const output of outputs) {
      try {
        if (output.script.length === 0) throw new Error('Empty script: fee output');

        // if output is unconfidential, we don't need to unblind it
        if (!isConfidentialOutput(output)) {
          unblindingResults.push({
            value: confidentialValueToSatoshi(output.value),
            asset: AssetHash.fromBytes(output.asset).hex,
            assetBlindingFactor: Buffer.alloc(32).toString('hex'),
            valueBlindingFactor: Buffer.alloc(32).toString('hex'),
          });
          continue;
        }
        const blindPrivKey = slip77node.derive(output.script).privateKey;
        if (!blindPrivKey)
          throw new Error('Blinding private key error for script ' + output.script.toString('hex'));

        const unblinded = this.lib.unblindOutputWithKey(output, blindPrivKey);

        unblindingResults.push({
          value: parseInt(unblinded.value, 10),
          asset: AssetHash.fromBytes(unblinded.asset).hex,
          assetBlindingFactor: unblinded.assetBlindingFactor.toString('hex'),
          valueBlindingFactor: unblinded.valueBlindingFactor.toString('hex'),
        });
      } catch (e: unknown) {
        if (e instanceof Error) {
          unblindingResults.push(e);
        } else {
          unblindingResults.push(new Error('unable to unblind output (unknown error)'));
        }
        continue;
      }
    }

    const network = (await this.appRepository.getNetwork()) ?? 'liquid';

    const successfullyUnblinded = unblindingResults.filter(
      (r): r is UnblindingData => !(r instanceof Error)
    );
    const assetSet = new Set<string>(successfullyUnblinded.map((u) => u.asset));
    for (const asset of assetSet) {
      const assetDetails = await this.assetRepository.getAsset(asset);
      if (assetDetails && !assetIsUnknown(assetDetails)) continue;
      const assetFromExplorer = await fetchAssetDetails(network, asset);
      await this.assetRepository.addAsset(asset, assetFromExplorer);
    }

    return unblindingResults;
  }
}

const emptyNonce: Buffer = Buffer.from('0x00', 'hex');

function bufferNotEmptyOrNull(buffer?: Buffer): boolean {
  return buffer != null && buffer.length > 0;
}

function isConfidentialOutput({ rangeProof, surjectionProof, nonce }: any): boolean {
  return (
    bufferNotEmptyOrNull(rangeProof) &&
    bufferNotEmptyOrNull(surjectionProof) &&
    nonce !== emptyNonce
  );
}
