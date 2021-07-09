import { MarinaEventType } from 'marina-provider';

type EventListenerID = string;

type MarinaEventListener = {
  id: EventListenerID;
  listener: EventListener;
};

const initialEventListeners: Record<MarinaEventType, MarinaEventListener[]> = {
  ENABLED: [],
  DISABLED: [],
  NETWORK: [],
  NEW_TX: [],
  NEW_UTXO: [],
  SPENT_UTXO: [],
};

export default class WindowProxy {
  private eventListeners: Record<MarinaEventType, MarinaEventListener[]> = initialEventListeners;

  proxy(name: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = makeid(16);

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

      // forward the method call to the content script via message passing
      this.call(id, name, params);
    });
  }

  call(id: string, name: string, params?: any[]) {
    window.postMessage(
      {
        id: id,
        name: name,
        params: params || [],
      },
      window.location.origin
    );
  }

  on(type: MarinaEventType, callback: (payload: any) => void): EventListenerID {
    const id = makeid(8);
    this.addEventListener(type, { id, listener: callback });
    return id;
  }

  off(id: EventListenerID) {
    this.removeEventListener(id);
  }

  // start the window listner for a given marina event type
  private startWindowListener(type: MarinaEventType) {
    window.addEventListener(`marina_event_${type.toLowerCase()}`, (event: Event) => {
      const payload = (event as CustomEvent).detail;
      for (const eventListener of this.eventListeners[type]) {
        eventListener.listener(payload);
      }
    });
  }

  private addEventListener(type: MarinaEventType, listener: MarinaEventListener) {
    this.eventListeners[type].push(listener);
    if (this.eventListeners[type].length === 1) this.startWindowListener(type);
  }

  private removeEventListener(id: EventListenerID) {
    for (const type of Object.keys(this.eventListeners) as MarinaEventType[]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        (eventListener) => eventListener.id !== id
      );
    }
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
