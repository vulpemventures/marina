const namespaceRegexp = /[$][a-z]+/;

export interface Context {
  // map namespace token to public key
  namespaces: Map<string, { pubkey: string }>; 
}

function replaceAll(str: string, find: string, replace: string): string {
  return str.split(find).join(replace);
}

export function getNamespaces(text: string): Array<string> {
  const namespaces = namespaceRegexp.exec(text);
  if (!namespaces) return [];
  return namespaces.map(n => n.slice(1)) // remove the '$' token
}

export function processNamespaces(ctx: Context['namespaces'], text: string): string {
  const namespaces = getNamespaces(text);
  if (!namespaces.length) return text;

  let processedText = text;
  for (const namespace of namespaces) {
    const namespacePublicKey = ctx.get(namespace)?.pubkey;
    if (!namespacePublicKey) throw new Error(`Could not find namespace context: ${namespace}`);
    processedText = replaceAll(processedText, '$' + namespace, namespacePublicKey);
  }

  return processedText;
}

export function preprocessor(ctx: Context, text: string): string {
  return processNamespaces(ctx.namespaces, text);
}
