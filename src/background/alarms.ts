import browser from 'webextension-polyfill';
import { updateTaxiAssets } from '../application/redux/actions/taxi';
import { marinaStore } from '../application/redux/store';

export enum Alarm {
  WalletUpdate = 'ALARM_WALLET_UPDATE',
  TaxiUpdate = 'ALARM_TAXI_UPDATE',
}

// newPeriodicTask create a new alarm + set up a listener for this task
function newPeriodicTask(alarm: Alarm, task: () => void, periodInMinutes: number) {
  return () => {
    browser.alarms.create(alarm, { periodInMinutes });
    browser.alarms.onAlarm.addListener(({ name }) => {
      if (name === alarm) task();
    });
    // update utxos and taxi on first run
    switch (alarm) {
      case Alarm.TaxiUpdate:
        dispatchUpdateTaxiAction();
        break;
      default:
        break;
    }
  };
}

function dispatchUpdateTaxiAction() {
  marinaStore.dispatch(updateTaxiAssets());
}

export const periodicTaxiUpdater = newPeriodicTask(Alarm.TaxiUpdate, dispatchUpdateTaxiAction, 1);

export const clearAllPeriodicUpdaters = () => {
  void browser.alarms.clearAll();
};
