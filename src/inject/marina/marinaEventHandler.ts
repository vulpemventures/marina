import type { MarinaEventType } from 'marina-provider';
import { parse } from '../../browser-storage-converters';
import { makeid } from '../proxy';

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

const allEvents = Object.keys(initialEventListeners);

/**
 * MarinaEventHandler provides on and off functions using to handle MarinaEvents.
 */
export default class MarinaEventHandler {
  private eventListeners: Record<MarinaEventType, MarinaEventListener[]> = initialEventListeners;

  on(type: MarinaEventType, callback: (payload: any) => void): EventListenerID {
    const uppercaseType = type.toUpperCase();
    if (!isMarinaEventType(uppercaseType))
      throw new Error(`event type is wrong, please choose one of the following: ${allEvents}`);

    const id = makeid(8);
    this.addEventListener(uppercaseType, { id, listener: callback });
    return id;
  }

  off(id: EventListenerID) {
    this.removeEventListener(id);
  }

  // start the window listner for a given marina event type
  private startWindowListener(type: MarinaEventType) {
    window.addEventListener(`marina_event_${type.toLowerCase()}`, (event: Event) => {
      const payload = parse((event as CustomEvent).detail);
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

function isMarinaEventType(str: string): str is MarinaEventType {
  return allEvents.includes(str);
}
