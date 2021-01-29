import { IdentityType, PrivateKey } from 'ldk';
import { ECPair } from 'liquidjs-lib';
import { regtest } from './network';

export const getRandomWallet = () => {
  return new PrivateKey({
    chain: 'regtest',
    type: IdentityType.PrivateKey,
    value: {
      signingKeyWIF: ECPair.makeRandom({ network: regtest }).toWIF(),
      blindingKeyWIF: ECPair.makeRandom({ network: regtest }).toWIF(),
    },
  });
};
