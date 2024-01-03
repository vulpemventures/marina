import Browser from 'webextension-polyfill';
import type { RefundSwapFlowRepository, RefundableSwapParams } from '../../domain/repository';
import { RefundSwapFlowStep } from '../../domain/repository';

enum RefundSwapFlowStorageKeys {
  REFUND_SWAP_FLOW_DATA = 'refundSwapFlowData',
}

export class RefundSwapFlowStorageAPI implements RefundSwapFlowRepository {
  private async getRefundSwapFlowData(): Promise<RefundableSwapParams | undefined> {
    const data = await Browser.storage.local.get(RefundSwapFlowStorageKeys.REFUND_SWAP_FLOW_DATA);
    return data[RefundSwapFlowStorageKeys.REFUND_SWAP_FLOW_DATA];
  }

  private async updateRefundSwapFlowData(
    data: Partial<RefundableSwapParams> | undefined
  ): Promise<void> {
    const currentData = await this.getRefundSwapFlowData();
    return Browser.storage.local.set({
      [RefundSwapFlowStorageKeys.REFUND_SWAP_FLOW_DATA]: {
        ...currentData,
        ...data,
      },
    });
  }

  async getStep(): Promise<RefundSwapFlowStep> {
    const data = await this.getRefundSwapFlowData();
    if (!data) return RefundSwapFlowStep.None;
    if (data.redeemScript) return RefundSwapFlowStep.ParamsEntered;
    return RefundSwapFlowStep.None;
  }

  reset(): Promise<void> {
    return Browser.storage.local.remove(RefundSwapFlowStorageKeys.REFUND_SWAP_FLOW_DATA);
  }

  async getParams(): Promise<RefundableSwapParams | undefined> {
    const data = await this.getRefundSwapFlowData();
    if (!data) return undefined;
    return data;
  }

  setParams(params: RefundableSwapParams | undefined): Promise<void> {
    return this.updateRefundSwapFlowData(params);
  }
}
