import { BlindingKeyGetter, IdentityType, PrivateKey, walletFromAddresses } from 'ldk';

export const sender = new PrivateKey({
  chain: 'regtest',
  type: IdentityType.PrivateKey,
  value: {
    signingKeyWIF: 'cPNMJD4VyFnQjGbGs3kcydRzAbDCXrLAbvH6wTCqs88qg1SkZT3J',
    blindingKeyWIF: 'cRdrvnPMLV7CsEak2pGrgG4MY7S3XN1vjtcgfemCrF7KJRPeGgW6',
  },
});

export const senderBlindKeyGetter: BlindingKeyGetter = (script: string) => {
  try {
    return sender.getBlindingPrivateKey(script);
  } catch (_) {
    return undefined;
  }
};

export const senderAddress = sender.getNextAddress().confidentialAddress;
export const senderBlindingKey = sender.getNextAddress().blindingPrivateKey;
export const senderWallet = walletFromAddresses(sender.getAddresses(), 'regtest');
