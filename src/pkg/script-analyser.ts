import type { bip341 } from 'liquidjs-lib';
import { script } from 'liquidjs-lib';

// analyse a script to know what it need as input
const { OPS } = script;

interface SignatureNeed {
  pubkey: string;
}

/**
 * Script input need is the object representing the need of inputs for a script
 * The current version can be improved: now it doesn't take into account the order of the inputs
 * `sigs` describes the need of signatures
 * `introspection` is a boolean indicating if the script contains any introspection opcodes
 * `needParameters` is a boolean indicating if the script needs parameters extra parameter (excluding CHECKSIG)
 */
export interface ScriptInputsNeeds {
  sigs: SignatureNeed[];
  hasIntrospection: boolean;
  needParameters: boolean;
}

const NEED_PARAMS_OPCODES = [
  OPS.OP_PUSHDATA1,
  OPS.OP_PUSHDATA2,
  OPS.OP_PUSHDATA4,
  OPS.OP_1NEGATE,
  OPS.OP_RESERVED,
  OPS.OP_IF,
  OPS.OP_VERIF,
  OPS.OP_VERNOTIF,
  OPS.OP_ELSE,
  OPS.OP_ENDIF,
  OPS.OP_VERIFY,
  OPS.OP_TOALTSTACK,
  OPS.OP_FROMALTSTACK,
  OPS.OP_2DROP,
  OPS.OP_2DUP,
  OPS.OP_3DUP,
  OPS.OP_2OVER,
  OPS.OP_2ROT,
  OPS.OP_2SWAP,
  OPS.OP_NIP,
  OPS.OP_OVER,
  OPS.OP_PICK,
  OPS.OP_ROLL,
  OPS.OP_ROT,
  OPS.OP_SWAP,
  OPS.OP_TUCK,
  OPS.OP_CAT,
  OPS.OP_SUBSTR,
  OPS.OP_SUBSTR_LAZY,
  OPS.OP_LEFT,
  OPS.OP_RIGHT,
  OPS.OP_SIZE,
  OPS.OP_INVERT,
  OPS.OP_AND,
  OPS.OP_OR,
  OPS.OP_XOR,
  OPS.OP_EQUAL,
  OPS.OP_EQUALVERIFY,
  OPS.OP_RESERVED1,
  OPS.OP_RESERVED2,
  OPS.OP_1ADD,
  OPS.OP_1SUB,
  OPS.OP_2MUL,
  OPS.OP_2DIV,
  OPS.OP_NEGATE,
  OPS.OP_ABS,
  OPS.OP_NOT,
  OPS.OP_0NOTEQUAL,
  OPS.OP_ADD,
  OPS.OP_SUB,
  OPS.OP_MUL,
  OPS.OP_DIV,
  OPS.OP_MOD,
  OPS.OP_LSHIFT,
  OPS.OP_RSHIFT,
  OPS.OP_BOOLAND,
  OPS.OP_BOOLOR,
  OPS.OP_NUMEQUAL,
  OPS.OP_NUMEQUALVERIFY,
  OPS.OP_NUMNOTEQUAL,
  OPS.OP_LESSTHAN,
  OPS.OP_GREATERTHAN,
  OPS.OP_LESSTHANOREQUAL,
  OPS.OP_GREATERTHANOREQUAL,
  OPS.OP_MIN,
  OPS.OP_MAX,
  OPS.OP_WITHIN,
  OPS.OP_RIPEMD160,
  OPS.OP_SHA1,
  OPS.OP_SHA256,
  OPS.OP_HASH160,
  OPS.OP_HASH256,
  OPS.OP_CODESEPARATOR,
  OPS.OP_CHECKMULTISIG,
  OPS.OP_CHECKMULTISIGVERIFY,
  OPS.OP_DETERMINISTICRANDOM,
  OPS.OP_SHA256INITIALIZE,
  OPS.OP_SHA256UPDATE,
  OPS.OP_SHA256FINALIZE,
  OPS.OP_ADD64,
  OPS.OP_SUB64,
  OPS.OP_MUL64,
  OPS.OP_DIV64,
  OPS.OP_NEG64,
  OPS.OP_LESSTHAN64,
  OPS.OP_LESSTHANOREQUAL64,
  OPS.OP_GREATERTHAN64,
  OPS.OP_GREATERTHANOREQUAL64,
  OPS.OP_SCRIPTNUMTOLE64,
  OPS.OP_LE64TOSCRIPTNUM,
  OPS.OP_LE32TOLE64,
  OPS.OP_ECMULSCALARVERIFY,
  OPS.OP_TWEAKVERIFY,
  OPS.OP_PUBKEYHASH,
  OPS.OP_PUBKEY,
  OPS.OP_INVALIDOPCODE,
];

const INTROSPECTION_OPCODES = [
  OPS.OP_INSPECTINPUTOUTPOINT,
  OPS.OP_INSPECTINPUTASSET,
  OPS.OP_INSPECTINPUTVALUE,
  OPS.OP_INSPECTINPUTSCRIPTPUBKEY,
  OPS.OP_INSPECTINPUTSEQUENCE,
  OPS.OP_INSPECTINPUTISSUANCE,
  OPS.OP_PUSHCURRENTINPUTINDEX,
  OPS.OP_INSPECTOUTPUTASSET,
  OPS.OP_INSPECTOUTPUTVALUE,
  OPS.OP_INSPECTOUTPUTNONCE,
  OPS.OP_INSPECTOUTPUTSCRIPTPUBKEY,
  OPS.OP_INSPECTVERSION,
  OPS.OP_INSPECTLOCKTIME,
  OPS.OP_INSPECTNUMINPUTS,
  OPS.OP_INSPECTNUMOUTPUTS,
];

type NeedAnalyserFunction = (stack: Buffer[]) => (pos: number) => ScriptInputsNeeds;

function validatePosition(stack: Buffer[], pos: number) {
  return !(pos < 0 || pos >= stack.length);
}

function mergeNeeds(...needs: ScriptInputsNeeds[]): ScriptInputsNeeds {
  return {
    sigs: needs.reduce((acc: ScriptInputsNeeds['sigs'], need) => acc.concat(need.sigs), []),
    hasIntrospection: needs.reduce(
      (acc: ScriptInputsNeeds['hasIntrospection'], need) => acc || need.hasIntrospection,
      false
    ),
    needParameters: needs.reduce(
      (acc: ScriptInputsNeeds['needParameters'], need) => acc || need.needParameters,
      false
    ),
  };
}

const needParametersAnalyser: NeedAnalyserFunction = (stack) => (pos) => {
  if (!validatePosition(stack, pos)) throw new Error('Invalid position (NEED PARAM OPCODE)');
  return {
    sigs: [],
    hasIntrospection: false,
    needParameters: true,
  };
};

const introspectionAnalyzer: NeedAnalyserFunction = (stack) => (pos) => {
  if (!validatePosition(stack, pos)) throw new Error('invalid position (INTROSPECTION OPCODE)');
  return {
    sigs: [],
    hasIntrospection: true,
    needParameters: false,
  };
};

const checksigAnalyzer: NeedAnalyserFunction = (stack) => (pos) => {
  if (!validatePosition(stack, pos)) throw new Error('invalid position (CHECKSIG)');
  if (!validatePosition(stack, pos - 1)) {
    return {
      sigs: [],
      hasIntrospection: false,
      needParameters: true,
    };
  }

  const pubkey = stack[pos - 1];

  return {
    sigs: [{ pubkey: pubkey.toString('hex') }],
    hasIntrospection: false,
    needParameters: false,
  };
};

const hex = (n: number) => Buffer.of(n).toString('hex');

const ANALYZERS_BY_OPCODE = new Map<string, NeedAnalyserFunction>().set(
  hex(OPS.OP_CHECKSIG),
  checksigAnalyzer
);

INTROSPECTION_OPCODES.forEach((op) => ANALYZERS_BY_OPCODE.set(hex(op), introspectionAnalyzer));
NEED_PARAMS_OPCODES.forEach((op) => ANALYZERS_BY_OPCODE.set(hex(op), needParametersAnalyser));

function decompileScript(b: Buffer): Buffer[] {
  const stack = script.decompile(b);
  if (stack === null) throw new Error('malformed script');
  return stack?.map((s) => (Buffer.isBuffer(s) ? s : Buffer.of(s))) ?? [];
}

/**
 * Analyze a script to know what it need as input
 * @param scriptHex must be a valid Elements script
 * @returns an object describing how to build the script inputs
 */
export function analyse(scriptHex: string): ScriptInputsNeeds {
  const scriptBuffer = Buffer.from(scriptHex, 'hex');
  const stack = decompileScript(scriptBuffer);

  let needs: ScriptInputsNeeds = {
    sigs: [],
    hasIntrospection: false,
    needParameters: false,
  };

  for (let i = 0; i < stack.length; i++) {
    const elem = stack[i].toString('hex');
    const analyser = ANALYZERS_BY_OPCODE.get(elem);
    if (!analyser) continue;
    needs = mergeNeeds(needs, analyser(stack)(i));
  }

  return needs;
}

export function analyzeTapscriptTree(tree?: bip341.HashTree): Record<string, ScriptInputsNeeds> {
  if (!tree) return {};
  const children = {
    ...(tree.left ? analyzeTapscriptTree(tree.left) : {}),
    ...(tree.right ? analyzeTapscriptTree(tree.right) : {}),
  };

  if (tree.scriptHex) return { ...children, [tree.scriptHex]: analyse(tree.scriptHex) };
  return children;
}
