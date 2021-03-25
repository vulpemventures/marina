const asyncIntervals: boolean[] = [];

const runAsyncInterval = async (
  cb: () => any,
  interval: number | undefined,
  intervalIndex: number
) => {
  await cb();
  if (asyncIntervals[intervalIndex - 1]) {
    setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
  }
};

export const setAsyncInterval = (cb: () => any, interval: number | undefined) => {
  if (cb && typeof cb === 'function') {
    const intervalIndex = asyncIntervals.length + 1;
    asyncIntervals.push(true);
    runAsyncInterval(cb, interval, intervalIndex).catch(console.error);
    return intervalIndex;
  } else {
    throw new Error('Callback must be a function');
  }
};

export const clearAsyncInterval = (intervalIndex: number) => {
  if (asyncIntervals[intervalIndex - 1]) {
    asyncIntervals[intervalIndex - 1] = false;
  }
};
