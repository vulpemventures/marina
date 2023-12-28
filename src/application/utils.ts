export function h2b(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

export function swapEndian(hex: string): string {
  return Buffer.from(hex, 'hex').reverse().toString('hex');
}
