import Browser from 'webextension-polyfill';
import type { ReceiveFlowRepository } from '../../domain/repository';
import { ReceiveFlowStep } from '../../domain/repository';
import type { ReverseSwap } from '../../pkg/boltz';

export type SwapData = ReverseSwap & {
  claimPrivateKey: Buffer;
};

type Data = {
  amount: number;
  asset: string;
  lightning: boolean;
  swapData: SwapData;
};

enum ReceiveFlowStorageKeys {
  RECEIVE_FLOW_DATA = 'receiveFlowData',
}

export class ReceiveFlowStorageAPI implements ReceiveFlowRepository {
  private async getReceiveFlowData(): Promise<Data | undefined> {
    const data = await Browser.storage.local.get(ReceiveFlowStorageKeys.RECEIVE_FLOW_DATA);
    if (!data) return undefined;
    const jsonData = data[ReceiveFlowStorageKeys.RECEIVE_FLOW_DATA];
    if (jsonData?.swapData?.preimage)
      jsonData.swapData.preimage = Buffer.from(jsonData.swapData.preimage, 'hex');
    if (jsonData?.swapData?.claimPrivateKey)
      jsonData.swapData.claimPrivateKey = Buffer.from(jsonData.swapData.claimPrivateKey, 'hex');
    return jsonData;
  }

  private async updateReceiveFlowData(data: Partial<Data>): Promise<void> {
    const jsonData = { ...data } as any;
    if (jsonData.swapData?.preimage)
      jsonData.swapData.preimage = jsonData.swapData.preimage.toString('hex');
    if (jsonData.swapData?.claimPrivateKey)
      jsonData.swapData.claimPrivateKey = jsonData.swapData.claimPrivateKey.toString('hex');
    const currentData = await this.getReceiveFlowData();
    console.log('updateReceiveFlowData', jsonData);
    return Browser.storage.local.set({
      [ReceiveFlowStorageKeys.RECEIVE_FLOW_DATA]: {
        ...currentData,
        ...jsonData,
      },
    });
  }

  reset(): Promise<void> {
    return Browser.storage.local.remove(ReceiveFlowStorageKeys.RECEIVE_FLOW_DATA);
  }

  async getStep(): Promise<ReceiveFlowStep> {
    const data = await this.getReceiveFlowData();
    if (!data) return ReceiveFlowStep.None;
    if (data.swapData) return ReceiveFlowStep.SwapRunning;
    if (data.amount) return ReceiveFlowStep.AmountInserted;
    if (data.lightning) return ReceiveFlowStep.AmountInserted;
    return ReceiveFlowStep.None;
  }

  async getSwapData(): Promise<SwapData | undefined> {
    const data = await this.getReceiveFlowData();
    if (!data) return undefined;
    return data.swapData;
  }

  async getAmount(): Promise<number | undefined> {
    const data = await this.getReceiveFlowData();
    if (!data) return undefined;
    return data.amount;
  }

  async setAmount(amount: number): Promise<void> {
    return this.updateReceiveFlowData({ amount });
  }

  async setSwapData(swapData: SwapData): Promise<void> {
    return this.updateReceiveFlowData({ swapData });
  }
}
