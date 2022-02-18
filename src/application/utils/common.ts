import browser from 'webextension-polyfill';

/**
 * Wait at least helper
 * @param time
 * @param promise
 */
export async function waitAtLeast(time: number, promise: Promise<any>) {
  // Promise that resolves when a timer has fired
  const promiseTimeout = new Promise((resolve) => {
    setTimeout(resolve, time);
  });
  // Wait for both the provided promise
  const promiseCombined = Promise.all([promise, promiseTimeout]);
  const values = await promiseCombined;
  return values[0];
}

export async function tabIsOpen(tabID: number): Promise<boolean> {
  const tabs = await browser.tabs.query({ currentWindow: true });
  for (const { id } of tabs) {
    if (id && id === tabID) return true;
  }
  return false;
}

export async function sleep(miliseconds: number) {
  await Promise.resolve(
    new Promise((resolve) => {
      setTimeout(resolve, miliseconds);
    })
  );
}
