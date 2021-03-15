import { Mnemonic } from './mnemonic';
import { mnemonic } from '../../../../test/fixtures/wallet.json';

test('Should be able to create a mnemonic', () => {
  const res = Mnemonic.create(mnemonic);
  expect(res.value).toContain(mnemonic);
});

test('Should be able to create a mnemonic from untrimed string', () => {
  const res = Mnemonic.create(
    '  certain leopard cake fox symptom scatter survey kid welcome credit become lonely  '
  );
  expect(res.value).toContain(mnemonic);
});

test('Should be able to create a mnemonic from multiple in-between spaces string', () => {
  const res = Mnemonic.create(
    'certain leopard   cake fox symptom scatter survey kid welcome       credit become  lonely'
  );
  expect(res.value).toContain(mnemonic);
});

test('Should throw if invalid mnemonic', () => {
  const mnemonicBad = [
    // 11 words
    'certain leopard cake fox symptom scatter survey kid welcome credit become',
    // Invalid 24 words
    'certain leopard cake fox symptom scatter survey kid welcome credit become lonely certain leopard cake fox symptom scatter survey kid welcome credit become lonely',
  ];

  mnemonicBad.forEach((m) => {
    expect(() => Mnemonic.create(m)).toThrow();
  });
});
