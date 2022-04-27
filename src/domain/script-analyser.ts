// analyse a script to know what it need as input

import type { bip341 } from 'ldk';
import { script } from 'ldk';
const { OPS } = script;

// TODO: schnoor sig or not ? (can be deduced from pubkey size)
interface SignatureNeed {
  pubkey: string;
}

/**
 * Script input need is the object representing the need of inputs for a script
 * The current version can be improved: now it doesn't take into account the order of the inputs
 * `sigs` describes the need of signatures
 * `introspection` is a boolean indicating if the script contains any introspection opcodes
 */
export interface ScriptInputsNeeds {
  sigs: SignatureNeed[];
  introspection: boolean;
}

const INTROSPECTION_OPCODES = [
  OPS.OP_INSPECTINPUTOUTPOINT,
  OPS.OP_INSPECTINPUTASSET,
  OPS.OP_INSPECTINPUTVALUE,
  OPS.OP_INSPECTINPUTSCRIPTPUBKEY,
  OPS.OP_INSPECTINPUTSEQUENCE,
  OPS.OP_INSPECTINPUTISSUANCE,
  // current index
  OPS.OP_PUSHCURRENTINPUTINDEX,
  // outputs
  OPS.OP_INSPECTOUTPUTASSET,
  OPS.OP_INSPECTOUTPUTVALUE,
  OPS.OP_INSPECTOUTPUTNONCE,
  OPS.OP_INSPECTOUTPUTSCRIPTPUBKEY,
  // transaction
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
    introspection: needs.reduce(
      (acc: ScriptInputsNeeds['introspection'], need) => acc || need.introspection,
      false
    ),
  };
}

const introspectionAnalyzer: NeedAnalyserFunction = (stack) => (pos) => {
  if (!validatePosition(stack, pos)) throw new Error('invalid position (INTROSPECTION OPCODE)');
  return {
    sigs: [],
    introspection: true,
  };
};

const checksigAnalyzer: NeedAnalyserFunction = (stack) => (pos) => {
  if (!validatePosition(stack, pos)) throw new Error('invalid position (CHECKSIG)');
  if (!validatePosition(stack, pos - 1)) throw new Error('invalid position (CHECKSIG PUBKEY)');

  const pubkey = stack[pos - 1];

  return {
    sigs: [{ pubkey: pubkey.toString('hex') }],
    introspection: false,
  };
};

const hex = (n: number) => Buffer.of(n).toString('hex');

const ANALYZERS_BY_OPCODE = new Map<string, NeedAnalyserFunction>().set(
  hex(OPS.OP_CHECKSIG),
  checksigAnalyzer
);

INTROSPECTION_OPCODES.forEach((op) => ANALYZERS_BY_OPCODE.set(hex(op), introspectionAnalyzer));

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
    introspection: false,
  };

  for (let i = 0; i < stack.length; i++) {
    const elem = stack[i].toString('hex');
    const analyser = ANALYZERS_BY_OPCODE.get(elem);
    if (!analyser) continue;
    needs = mergeNeeds(needs, analyser(stack)(i));
  }

  return needs;
}

export function analyzeTapscriptTree(tree: bip341.HashTree): Record<string, ScriptInputsNeeds> {
  const children = {
    ...(tree.left ? analyzeTapscriptTree(tree.left) : {}),
    ...(tree.right ? analyzeTapscriptTree(tree.right) : {}),
  };

  if (tree.scriptHex) return { ...children, [tree.scriptHex]: analyse(tree.scriptHex) };
  return children;
}
