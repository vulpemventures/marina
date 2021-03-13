import { AddressInterface } from 'ldk';

export interface MarinaProvider {
  enable(): Promise<void>;
  disable(): Promise<void>;

  getAddresses(): Promise<Record<number, AddressInterface[]>>;

  getNextAddress(account?: number): Promise<AddressInterface>;
  getNextChangeAddress(account?: number): Promise<AddressInterface>;

  sendTransaction(
    recipientAddress: string,
    amountInSatoshis: number,
    assetHash: string
  ): Promise<string>;
  signTransaction(psetBase64: string): Promise<string>;
}

export default class Marina implements MarinaProvider {
  getNextAddress(account?: number): Promise<AddressInterface> {
    throw new Error('Method not implemented.');
  }
  getNextChangeAddress(account?: number): Promise<AddressInterface> {
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

  getAddresses(): Promise<Record<number, AddressInterface[]>> {
    return this.proxy(this.getAddresses.name, []);
  }

  enable(): Promise<void> {
    return this.proxy(this.enable.name, []);
  }

  disable(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  proxy(name: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = makeid(8);

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

  call(id: string, name: string, params?: any[]) {
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
