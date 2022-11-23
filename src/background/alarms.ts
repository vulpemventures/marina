import browser from 'webextension-polyfill';

export enum Alarm {
  TaxiUpdate = 'ALARM_TAXI_UPDATE',
}

// newPeriodicTask create a new alarm + set up a listener for this task
export function setPeriodicTask(alarm: Alarm, task: () => void, periodInMinutes: number) {
  browser.alarms.create(alarm, { periodInMinutes });
  browser.alarms.onAlarm.addListener(({ name }) => {
    if (name === alarm) task();
  });
  task();
}

export const clearAllPeriodicUpdaters = () => {
  void browser.alarms.clearAll();
};
