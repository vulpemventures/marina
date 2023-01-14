import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { AssetHash, confidential } from 'liquidjs-lib';
import type { ZKPInterface } from 'liquidjs-lib/src/confidential';
import { confidentialValueToSatoshi } from 'liquidjs-lib/src/confidential';
import type { Output } from 'liquidjs-lib/src/transaction';
import type { AppRepository, AssetRepository, WalletRepository } from '../infrastructure/repository';
import type { UnblindingData } from './transaction';

type AssetAxiosResponse = AxiosResponse<{ name?: string; ticker?: string; precision?: number }>;

export interface Unblinder {
  unblind(...outputs: Output[]): Promise<(UnblindingData | Error)[]>;
}

export class WalletRepositoryUnblinder implements Unblinder {
  private lib: confidential.Confidential;

  constructor(
    private cache: WalletRepository,
    private appRepository: AppRepository,
    private assetRepository: AssetRepository,
    zkpLib: ZKPInterface
  ) {
    this.lib = new confidential.Confidential(zkpLib);
  }

  async unblind(...outputs: Output[]): Promise<(UnblindingData | Error)[]> {
    const scripts = outputs.map((o) => o.script.toString('hex'));
    const scriptDetails = await this.cache.getScriptDetails(...scripts);

    const unblindingResults: (UnblindingData | Error)[] = [];

    for (const output of outputs) {
      try {
        const script = output.script.toString('hex');

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

        const blindingPrivKey = scriptDetails[script]?.blindingPrivateKey;
        if (!blindingPrivKey) throw new Error('Could not find script blindingKey in cache');

        const unblinded = this.lib.unblindOutputWithKey(
          output,
          Buffer.from(blindingPrivKey, 'hex')
        );

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
          ticker: ticker || '????',
          precision: precision || 8,
          assetHash: asset,
        });
      } catch (e) {
        await this.assetRepository.addAsset(asset, {
          name: 'Unknown',
          ticker: '????',
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
