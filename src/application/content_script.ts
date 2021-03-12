import { browser } from 'webextension-polyfill-ts';


// look at https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions
if (shouldInjectProvider()) {
  injectScript(browser.extension.getURL('inject.js'));
  (window as Record<string, any>).port = browser.runtime.connect();
  (window as Record<string, any>).port.onMessage.addListener(function (m: any) {
    console.log("In content script, received message from background script: " + m);
  });

  window.addEventListener("message", (event) => {
    // We only accept messages from ourselves
    if (event.source != window)
      return;

    if (event.data.type && (event.data.type == "FROM_PAGE")) {
      console.log("we cazzu: " + event.data.text);
      (window as Record<string, any>).port.postMessage(event.data.text);
    }
  }, false);
};

/**
 * Determines if the provider should be injected
 *
 * @returns {boolean} {@code true} Whether the provider should be injected
 */
function shouldInjectProvider() {
  return (
    doctypeCheck() &&
    suffixCheck() &&
    documentElementCheck()
  );
}


function injectScriptFromFunction(func: Function) {
  try {
    var actualCode = '(' + func + ')();'
    var script = document.createElement('script');
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (error) {
    console.error('Marina: Liquid Provider injection failed.', error);
  }
}

/**
 * Injects a script tag into the current document
 *
 * @param {string} content - Code to be executed in the current document
 */
function injectScript(content: string) {
  try {
    const container = document.head || document.documentElement;
    const scriptTag = document.createElement('script');

    scriptTag.setAttribute('async', 'false');
    scriptTag.src = content;
    container.insertBefore(scriptTag, container.children[0]);
    scriptTag.onload = function () {
      container.removeChild(scriptTag);
    };
  } catch (error) {
    console.error('Marina: Liquid Provider injection failed.', error);
  }
}

/**
 * Checks the doctype of the current document if it exists
 *
 * @returns {boolean} {@code true} if the doctype is html or if none exists
 */
function doctypeCheck(): boolean {
  const { doctype } = window.document;
  if (doctype) {
    return doctype.name === 'html';
  }
  return true;
}

/**
 * Returns whether or not the extension (suffix) of the current document is prohibited
 *
 * This checks {@code window.location.pathname} against a set of file extensions
 * that we should not inject the provider into. This check is indifferent of
 * query parameters in the location.
 *
 * @returns {boolean} whether or not the extension of the current document is prohibited
 */
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

/**
 * Checks the documentElement of the current document
 *
 * @returns {boolean} {@code true} if the documentElement is an html node or if none exists
 */
function documentElementCheck(): boolean {
  const documentElement = document.documentElement.nodeName;
  if (documentElement) {
    return documentElement.toLowerCase() === 'html';
  }
  return true;
}

export { }