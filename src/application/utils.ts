export function h2b(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

export function b2hReversed(buffer: Buffer): string {
  return Buffer.from(buffer).reverse().toString('hex');
}

export function h2bReversed(hex: string): Buffer {
  return h2b(hex).reverse();
}
