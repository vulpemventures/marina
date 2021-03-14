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
