/**
 * DynamicStorageKey is an helper class used to create chrome.storage-like keys.
 * It allows to create a key with a custom prefix and extra parameters.
 */
export class DynamicStorageKey<ParamType extends Array<string | number>> {
  static PREFIX_SEPARATOR = '#';
  static KEY_DATA_SEPARATOR = '/';

  constructor(private readonly prefix: string) {}

  make(...data: ParamType) {
    return `${this.prefix}#${data.join('/')}`;
  }

  decode(key: string): ParamType {
    const indexOfPrefixSeparator = key.indexOf(DynamicStorageKey.PREFIX_SEPARATOR);
    if (indexOfPrefixSeparator === -1) {
      throw new Error(`Invalid key: ${key}`);
    }

    const prefix = key.substring(0, indexOfPrefixSeparator);
    if (prefix !== this.prefix) {
      throw new Error(`Invalid prefix: ${prefix}`);
    }

    const data = key
      .substring(indexOfPrefixSeparator + 1)
      .split(DynamicStorageKey.KEY_DATA_SEPARATOR);
    // cast to number if value is a str representation of a number
    return data.map((value) => (isNaN(Number(value)) ? value : Number(value))) as ParamType;
  }

  is(key: string): boolean {
    try {
      this.decode(key);
      return true;
    } catch (e) {
      return false;
    }
  }
}
