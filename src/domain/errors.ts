export class CoinSelectionError extends Error {
  constructor(public target: { amount: number; asset: string }, public selectedAmount: number) {
    super(
      `Coin selection failed for ${target.amount} with ${selectedAmount} selected (asset: ${target.asset}))`
    );
    this.name = 'CoinSelectionError';
  }
}
