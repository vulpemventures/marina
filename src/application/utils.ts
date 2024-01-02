export function h2b(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

export function num2hex(num: number): string {
  let hex = num.toString(16);
  if (hex.length % 2 > 0) hex = '0' + hex;
  return hex;
}

export function swapEndian(hex: string): string {
  return Buffer.from(hex, 'hex').reverse().toString('hex');
}
