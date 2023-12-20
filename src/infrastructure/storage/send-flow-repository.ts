import Browser from 'webextension-polyfill';
import type { SendFlowRepository } from '../../domain/repository';
import { SendFlowStep } from '../../domain/repository';

type Data = {
  pset?: string;
  receiverAddress?: string;
  amount?: number;
  asset?: string;
  lightning?: boolean;
};

enum SendFlowStorageKeys {
  SEND_FLOW_DATA = 'sendFlowData',
}

export class SendFlowStorageAPI implements SendFlowRepository {
  private async getSendFlowData(): Promise<Data | undefined> {
    const data = await Browser.storage.local.get(SendFlowStorageKeys.SEND_FLOW_DATA);
    return data[SendFlowStorageKeys.SEND_FLOW_DATA];
  }

  private async updateSendFlowData(data: Partial<Data>): Promise<void> {
    const currentData = await this.getSendFlowData();
    return Browser.storage.local.set({
      [SendFlowStorageKeys.SEND_FLOW_DATA]: {
        ...currentData,
        ...data,
      },
    });
  }

  async getStep(): Promise<SendFlowStep> {
    const data = await this.getSendFlowData();
    if (!data) return SendFlowStep.None;
    if (data.pset) return SendFlowStep.FeeFormDone;
    if (data.receiverAddress && data.amount) return SendFlowStep.AddressAmountFormDone;
    if (data.asset && !data.lightning) return SendFlowStep.AssetSelected;
    if (data.asset && data.lightning) return SendFlowStep.Lightning;
    return SendFlowStep.None;
  }

  reset(): Promise<void> {
    return Browser.storage.local.remove(SendFlowStorageKeys.SEND_FLOW_DATA);
  }

  async getSelectedAsset(): Promise<string | undefined> {
    const data = await this.getSendFlowData();
    if (!data) return undefined;
    return data.asset;
  }

  async getReceiverAddress(): Promise<string | undefined> {
    const data = await this.getSendFlowData();
    if (!data) return undefined;
    return data.receiverAddress;
  }

  async getAmount(): Promise<number | undefined> {
    const data = await this.getSendFlowData();
    if (!data) return undefined;
    return data.amount;
  }

  async getPset(): Promise<string | undefined> {
    const data = await this.getSendFlowData();
    if (!data) return undefined;
    return data.pset;
  }

  async getUnsignedPset(): Promise<string | undefined> {
    const data = await this.getSendFlowData();
    if (!data) return undefined;
    return data.pset;
  }

  setSelectedAsset(asset: string): Promise<void> {
    return this.updateSendFlowData({ asset });
  }

  setReceiverAddressAmount(address: string, amount: number): Promise<void> {
    return this.updateSendFlowData({ receiverAddress: address, amount });
  }

  setUnsignedPset(pset: string): Promise<void> {
    return this.updateSendFlowData({ pset });
  }

  setLightning(lightning: boolean): Promise<void> {
    return this.updateSendFlowData({ lightning });
  }
}
