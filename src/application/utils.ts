import type { AxiosResponse } from 'axios';

export function h2b(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

export type AssetAxiosResponse = AxiosResponse<{
  name?: string;
  ticker?: string;
  precision?: number;
}>;
