import { address, crypto, networks, script } from 'liquidjs-lib';
import type { NetworkString } from 'marina-provider';

export const addressFromScript = (
  redeemScript: string,
  network: NetworkString = 'liquid'
): string => {
  const sha256 = crypto.sha256(Buffer.from(redeemScript, 'hex')).toString('hex');
  const scriptASM = `OP_0 ${sha256}`;
  return address.fromOutputScript(script.fromASM(scriptASM), networks[network]);
};
