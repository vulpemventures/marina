import { toXpub, bip32 } from 'ldk';

const extendedPubKeyRegexp = /[a-z]pub[a-km-zA-HJ-NP-Z1-9]{100,108}/;

export interface Context {
  xpubs: Map<string, { derivationPath: string }>; // map xpub to derivation path
}

function replaceAll(str: string, find: string, replace: string): string {
  return str.split(find).join(replace);
}

export function processXPubs(xpubsContext: Context['xpubs'], text: string): string {
  const xpubsInText = extendedPubKeyRegexp.exec(text);
  if (!xpubsInText) return text;

  let processedText = text;
  for (const xpub of xpubsInText) {
    const xpubCxt = xpubsContext.get(xpub);
    if (!xpubCxt) throw new Error(`Could not find xpub context: ${xpub}`);
    const bip32Node = bip32.fromBase58(toXpub(xpub));
    const pubkey = bip32Node.derivePath(xpubCxt.derivationPath).publicKey.toString('hex');
    processedText = replaceAll(processedText, xpub, pubkey);
  }

  return processedText;
}

export function preprocessor(ctx: Context, text: string): string {
  return processXPubs(ctx.xpubs, text);
}
