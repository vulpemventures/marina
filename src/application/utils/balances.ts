import { BalancesByAsset } from '../redux/selectors/balance.selector';

const addBalance = (toAdd: BalancesByAsset) => (base: BalancesByAsset) => {
  const result = base;
  for (const asset of Object.keys(toAdd)) {
    result[asset] = (result[asset] ?? 0) + toAdd[asset];
  }

  return result;
};

export const sumBalances = (...balances: BalancesByAsset[]) => {
  const [balance, ...rest] = balances;
  let result = balance;
  const addFns = rest.map(addBalance);
  addFns.forEach((f) => (result = f(result)));

  return result;
};
