import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { AssetHash, confidential } from 'liquidjs-lib';
import type { ZKPInterface } from 'liquidjs-lib/src/confidential';
import { confidentialValueToSatoshi } from 'liquidjs-lib/src/confidential';
import type { Output } from 'liquidjs-lib/src/transaction';
import { SLIP77Factory } from 'slip77';
import type {
  AppRepository,
  AssetRepository,
  WalletRepository,
} from '../infrastructure/repository';
import type { UnblindingData } from './transaction';
import * as ecc from 'tiny-secp256k1';

const slip77 = SLIP77Factory(ecc);

type AssetAxiosResponse = AxiosResponse<{ name?: string; ticker?: string; precision?: number }>;

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

    const webExplorerURL = await this.appRepository.getWebExplorerURL();
    if (!webExplorerURL) {
      console.error('Web explorer URL not found, cannot update local asset registry');
      return unblindingResults;
    }

    const successfullyUnblinded = unblindingResults.filter(
      (r): r is UnblindingData => !(r instanceof Error)
    );
    const assetSet = new Set<string>(successfullyUnblinded.map((u) => u.asset));
    for (const asset of assetSet) {
      const assetDetails = await this.assetRepository.getAsset(asset);
      if (assetDetails && assetDetails.name !== 'Unknown') continue;
      try {
        const { name, ticker, precision } = await axios
          .get<any, AssetAxiosResponse>(`${webExplorerURL}/api/asset/${asset}`)
          .then((r) => r.data);

        await this.assetRepository.addAsset(asset, {
          name: name || 'Unknown',
          ticker: ticker || asset.substring(0, 4),
          precision: precision || 8,
          assetHash: asset,
        });
      } catch (e) {
        await this.assetRepository.addAsset(asset, {
          name: 'Unknown',
          ticker: asset.substring(0, 4),
          precision: 8,
          assetHash: asset,
        });
        console.warn(e);
        continue;
      }
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
