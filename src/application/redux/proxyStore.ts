import { RootReducerState } from './../../domain/common';
import { serializerAndDeserializer } from './store';
import { AnyAction } from 'redux';
import { Store } from 'webext-redux';
import { browser } from 'webextension-polyfill-ts';
import { restoreAndSetAddressesFromState } from '../backend';

export type ProxyStoreDispatch = (action: AnyAction) => Promise<void>;

export class ProxyStore extends Store<RootReducerState, AnyAction> {
  private badgeSet = false;

  constructor() {
    super(serializerAndDeserializer);
    this.subscribe(() => {
      const pendingTxStep = this.getState().transaction.step;
      if (pendingTxStep === 'empty') {
        if (!this.badgeSet) return;
        this.badgeSet = false;
        browser.browserAction.setBadgeText({ text: '' }).catch((ignore) => ({}));
      } else {
        if (this.badgeSet) return;
        this.badgeSet = true;
        browser.browserAction.setBadgeText({ text: '1' }).catch((ignore) => ({}));
      }

      const hasAddresses = this.getState().wallet.confidentialAddresses.length > 0
      if (!hasAddresses) {
        this.dispatch(restoreAndSetAddressesFromState())
      }
    });
  }
}
