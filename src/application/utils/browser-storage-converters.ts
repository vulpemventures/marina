/**
 * Browser storage has some limitations (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
 * It cannot store Map
 * It will convert Buffer to JSON representation of Buffer but will not parse back to Buffer
 * stringify/parse helpers aim to overcome those issues
 * Buffer are converted to hex strings
 */

export function stringify(value: any, space?: string | number) {
  if (value instanceof Map) {
    return JSON.stringify([...value], replacer, space);
  } else {
    return JSON.stringify(value, replacer, space);
  }
}

export function parse(text: string) {
  return JSON.parse(text, reviver);
}

export function replacer(key: string, value: any) {
  if (isBufferLike(value)) {
    if (isArray(value.data)) {
      if (value.data.length > 0) {
        value.data = 'hex:' + toHexString(value.data);
      } else {
        value.data = '';
      }
    }
  }
  return value;
}

export function reviver(key: string, value: any) {
  if (isBufferLike(value)) {
    if (isArray(value.data)) {
      return Buffer.from(value.data);
    } else if (isString(value.data)) {
      if (value.data.startsWith('hex:')) {
        return toBuffer(value.data.slice('hex:'.length));
      }
      // Assume that the string is UTF-8 encoded (or empty).
      return Buffer.from(value.data);
    }
  }
  return value;
}

function isBufferLike(x: any): boolean {
  return isObject(x) && x.type === 'Buffer' && (isArray(x.data) || isString(x.data));
}

function isArray(x: any): boolean {
  return Array.isArray(x);
}

function isString(x: any): boolean {
  return typeof x === 'string';
}

function isObject(x: any): boolean {
  return typeof x === 'object' && x !== null;
}

function toHexString(byteArray: Buffer) {
  return Array.prototype.map
    .call(byteArray, function (byte) {
      return ('0' + (byte & 0xff).toString(16)).slice(-2);
    })
    .join('');
}

function toBuffer(hexString: string) {
  const arr = [];
  for (let i = 0; i < hexString.length; i += 2) {
    arr.push(parseInt(hexString.substr(i, 2), 16));
  }
  // Using Uint8Array here would throw in BIP174 lib when building tx in ChooseFee
  // https://github.com/bitcoinjs/bip174/blob/master/ts_src/lib/utils.ts#L125
  return Buffer.from(arr);
}
