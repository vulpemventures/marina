import { browser } from 'webextension-polyfill-ts';

import Broker from './broker';

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
