import browser from 'webextension-polyfill';
import { updateTaxiAssets } from '../application/redux/actions/taxi';
import { updateTaskAction } from '../application/redux/actions/updater';
import { selectNetwork } from '../application/redux/selectors/app.selector';
import {
  selectAllAccountsIDs,
  selectUpdaterIsLoading,
} from '../application/redux/selectors/wallet.selector';
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
      if (name === alarm) {
        task();
      }
    });
  };
}

function dispatchUpdateTaskForAllAccountsIDs() {
  const state = marinaStore.getState();
  const isUpdating = selectUpdaterIsLoading(state);
  if (isUpdating) return; // skip if any updater worker is already running
  const accountIDs = selectAllAccountsIDs(state);
  const network = selectNetwork(state);
  const updateTasks = accountIDs.map((id) => updateTaskAction(id, network));
  updateTasks.forEach(marinaStore.dispatch);
}

function dispatchUpdateTaxiAction() {
  marinaStore.dispatch(updateTaxiAssets());
}

export const periodicUpdater = newPeriodicTask(
  Alarm.WalletUpdate,
  dispatchUpdateTaskForAllAccountsIDs,
  1
);
export const periodicTaxiUpdater = newPeriodicTask(Alarm.TaxiUpdate, dispatchUpdateTaxiAction, 3);
