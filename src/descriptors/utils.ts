const hexRegExp = /^([A-Fa-f0-9]{2})+/;

export function readHex(text: string): [string, string] {
  return readWithRegExp(hexRegExp, text);
}

function readWithRegExp(regexp: RegExp, text: string): [string, string] {
  const match = text.match(regexp);
  if (!match) {
    return ['', text];
  }
  return [match[0], text.slice(match[0].length)];
}

export function readUntil(text: string, char: string): [string, string] {
  const index = text.indexOf(char);
  if (index === -1) {
    throw new Error(`Expected ${char}`);
  }
  return [text.slice(0, index), text.slice(index)];
}
