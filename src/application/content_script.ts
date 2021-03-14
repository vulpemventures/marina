import EventEmitter from 'events';
import { browser, Runtime } from 'webextension-polyfill-ts';

class Broker {
  port: Runtime.Port;
  emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.port = browser.runtime.connect();
    this.port.onMessage.addListener((message) => this.onMessage(message));
  }

  onMessage(message: { id: string; payload: { success: boolean; data?: any; error?: string } }) {
    // emit event when background script reponds
    this.emitter.emit(message.id, message.payload);
  }

  start() {
    // start listening for messages from the injected script in page
    window.addEventListener(
      'message',
      (event) => {
        if (event.source !== window) return;
        if (!event.data) return;

        const { id, name, params } = event.data;
        if (!id || !name) return;

        // forward message to the background script
        this.port.postMessage({
          id,
          name,
          params,
        });

        // listen for events from the background script
        // we are going to notify the injected script in page we got a reponse
        this.emitter.once(id, (result: { success: boolean; data?: any; error?: string }) =>
          window.dispatchEvent(new CustomEvent(id, { detail: result }))
        );
      },
      false
    );
  }
}

// look at https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions
if (doctypeCheck() && suffixCheck() && documentElementCheck()) {
  const broker = new Broker();
  broker.start();

  injectScript(browser.extension.getURL('inject.js'));
}

function injectScript(script: string) {
  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement('script');

    scriptTag.setAttribute('async', 'false');
    scriptTag.src = script;
    container.insertBefore(scriptTag, container.children[0]);
    scriptTag.onload = function () {
      container.removeChild(scriptTag);
    };
  } catch (error) {
    console.error('Marina: Liquid Provider injection failed.', error);
  }
}

function doctypeCheck(): boolean {
  const { doctype } = window.document;
  if (doctype) {
    return doctype.name === 'html';
  }
  return true;
}

function suffixCheck(): boolean {
  const prohibitedTypes = [/\.xml$/u, /\.pdf$/u];
  const currentUrl = window.location.pathname;
  for (let i = 0; i < prohibitedTypes.length; i++) {
    if (prohibitedTypes[i].test(currentUrl)) {
      return false;
    }
  }
  return true;
}

function documentElementCheck(): boolean {
  const documentElement = document.documentElement.nodeName;
  if (documentElement) {
    return documentElement.toLowerCase() === 'html';
  }
  return true;
}
