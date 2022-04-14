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

const secp256k1imports = {
  './rand.js': rand,
  './validate_error.js': validate_error,
};

class WasmModule {
  static BASE64_WASM_PREFIX = 'data:application/wasm;base64,';
  private _instance: WebAssembly.Instance;

  constructor(module: WebAssembly.Instance) {
    this._instance = module;
  }

  static async fromBase64(base64: string, imports: Record<string, any> = {}): Promise<WasmModule> {
    const withoutPrefix = base64.replace(WasmModule.BASE64_WASM_PREFIX, '');
    const m = await WebAssembly.compile(Buffer.from(withoutPrefix, 'base64'));
    const instance = await WebAssembly.instantiate(m, imports);
    return new WasmModule(instance);
  }

  get exports() {
    return this._instance.exports;
  }
}
const secp256k1 = await WasmModule.fromBase64(b64wasm, secp256k1imports);
const ecc = secp256k1.exports;

export default ecc;
