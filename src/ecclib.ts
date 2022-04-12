/**
 * ecclib.ts is a *standalone* file, it shouldn't be imported in other files.
 * webpack.common.js will use it to inject wasm module as a base64 string instead of a wasm file.
 * This is useful for browsers that do not let us embed .wasm file in content-script context.
 */

// @ts-ignore
// eslint-disable-next-line
import b64wasm from 'tiny-secp256k1-lib/secp256k1.wasm';
// @ts-ignore
// eslint-disable-next-line
import * as rand from 'tiny-secp256k1-lib/rand.browser.js';
// @ts-ignore
// eslint-disable-next-line
import * as validate_error from 'tiny-secp256k1-lib/validate_error.js';
import type { TinySecp256k1Interface as LDKSecpI, bip341 } from 'ldk';

const secp256k1imports = {
  './rand.js': rand,
  './validate_error.js': validate_error,
};

type TinySecp256k1Interface = LDKSecpI & bip341.TinySecp256k1Interface;

class WasmModule<T = any> {
  static BASE64_WASM_PREFIX = 'data:application/wasm;base64,';
  private _instance: WebAssembly.Instance;

  constructor(module: WebAssembly.Instance) {
    this._instance = module;
  }

  static async fromBase64<T = any>(
    base64: string,
    imports: Record<string, any> = {}
  ): Promise<WasmModule<T>> {
    const withoutPrefix = base64.replace(WasmModule.BASE64_WASM_PREFIX, '');
    console.log(Buffer.from(withoutPrefix, 'base64'));
    const m = await WebAssembly.compile(Buffer.from(withoutPrefix, 'base64'));
    const instance = await WebAssembly.instantiate(m, imports);
    return new WasmModule<T>(instance);
  }

  get exports(): T {
    return this._instance.exports as unknown as T;
  }
}
console.log(b64wasm);

const secp256k1 = await WasmModule.fromBase64<TinySecp256k1Interface>(
  b64wasm as unknown as string,
  secp256k1imports
);
const ecc = secp256k1.exports;

console.log(
  ecc.isPoint(
    Buffer.from('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', 'hex')
  )
);

export default ecc;
