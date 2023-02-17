import { parse } from '../infrastructure/browser-storage-converters';

export default class WindowProxy<T extends string> {
  protected providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  proxy(name: T, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = makeid(16);

      // here we listen for response from the content script
      window.addEventListener(
        id,
        (event: Event) => {
          if (!(event instanceof Event)) return reject(new Error('invalid event'));
          const response = parse((event as CustomEvent).detail);

          if (!response.success) return reject(new Error(response?.error ?? 'unknown error'));
          return resolve(response.data);
        },
        {
          once: true,
          passive: true,
        }
      );

      // forward the method call to the content script via message passing
      this.call(id, name, params);
    });
  }

  call(id: string, name: T, params: any[]) {
    window.postMessage(
      {
        id,
        name,
        params,
        provider: this.providerName,
      },
      window.location.origin
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
