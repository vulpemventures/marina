import { AddressInterface } from 'ldk';

export interface MarinaProvider {
  enable(): Promise<void>;
  disable(): Promise<void>;

  setAccount(account: number): Promise<void>;
  getAddresses(): Promise<AddressInterface[]>;

  getNextAddress(): Promise<AddressInterface>;
  getNextChangeAddress(): Promise<AddressInterface>;

  sendTransaction(
    recipientAddress: string,
    amountInSatoshis: number,
    assetHash: string
  ): Promise<string>;

  blindTransaction(psetBase64: string): Promise<string>;
  signTransaction(psetBase64: string): Promise<string>;
}

export default class Marina implements MarinaProvider {
  enable(): Promise<void> {
    return this.proxy(this.enable.name, []);
  }

  disable(): Promise<void> {
    return this.proxy(this.disable.name, []);
  }

  getAddresses(): Promise<AddressInterface[]> {
    return this.proxy(this.getAddresses.name, []);
  }

  getNextAddress(): Promise<AddressInterface> {
    throw new Error('Method not implemented.');
  }
  getNextChangeAddress(): Promise<AddressInterface> {
    throw new Error('Method not implemented.');
  }

  setAccount(account: number): Promise<void> {
    throw new Error('Method not implemented.');
  }

  blindTransaction(psetBase64: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  sendTransaction(
    recipientAddress: string,
    amountInSatoshis: number,
    assetHash: string
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  signTransaction(psetBase64: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  private proxy(name: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = makeid(16);

      // forward the method call to the content script via message passing
      this.call(id, name, params);

      // here we listen for response from the content script
      window.addEventListener(
        id,
        (event: Event) => {
          const response = (event as CustomEvent).detail;

          if (!response.success) return reject(new Error(response.error));

          return resolve(response.data);
        },
        {
          once: true,
          passive: true,
        }
      );
    });
  }

  private call(id: string, name: string, params?: any[]) {
    window.postMessage(
      {
        id: id,
        name: name,
        params: params || [],
      },
      '*'
    );
  }
}

/**
 * Generates a random id of a fixed length.
 * @param length size of the string id.
 */
export function makeid(length: number): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
