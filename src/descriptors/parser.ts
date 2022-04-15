import type { AST } from './ast';
import { ScriptType, TypeAST } from './ast';
import { readHex, readUntil } from './utils';
import { script } from 'ldk';

const EXPECT_TOKEN = (token: string) => new Error(`Expected ${token}`);

function cmd(type: ScriptType): string {
  return type.toString();
}

type Parser = (text: string) => [AST | undefined, string];

function compose(...parsers: Parser[]): Parser {
  return (text: string) => {
    let result: AST | undefined;
    let remainingText = text.trimStart();
    for (const parser of parsers) {
      const [child, text] = parser(remainingText);
      if (child) {
        if (result) {
          result.children.push(child);
        } else {
          result = child;
        }
      }
      remainingText = text.trimStart();
    }

    return [result, remainingText];
  };
}

function oneOf(...parsers: Parser[]): Parser {
  const errors: Error[] = [];
  return (text: string) => {
    for (const parser of parsers) {
      try {
        return parser(text);
      } catch (e) {
        // ignore
        if (e instanceof Error) {
          errors.push(e);
        }
      }
    }

    throw new Error(`one of: ${errors.map((e) => e.message).join(', ')}`);
  };
}

const parseHEX: Parser = (text: string) => {
  const [hex, remainingText] = readHex(text);
  return [{ type: TypeAST.HEX, value: hex, children: [] }, remainingText];
};

const parseKEY: Parser = (text: string) => {
  const [hex, remainingText] = readHex(text);
  if (hex.length !== 64) {
    throw EXPECT_TOKEN('key (hex string with len=64)');
  }

  return [{ type: TypeAST.KEY, value: hex, children: [] }, remainingText];
};

const parseASMScript: Parser = (text: string) => {
  const [str, remainingText] = readUntil(text, ')');
  const asmScript = script.fromASM(str);
  return [{ type: TypeAST.HEX, value: asmScript.toString('hex'), children: [] }, remainingText];
};

// parse a token, does not create any AST node
const parseToken =
  (token: string): Parser =>
  (text: string) => {
    if (text.startsWith(token)) {
      return [undefined, text.slice(token.length)];
    }

    throw EXPECT_TOKEN(token);
  };

const parseTreeToken: Parser = (text: string) => {
  const [, remainingText] = parseToken('{')(text);
  return [{ type: TypeAST.TREE, value: undefined, children: [] }, remainingText];
};

// tree parser
const parseTREE: Parser = (text: string) => {
  if (text.startsWith('{')) {
    return compose(parseTreeToken, parseTREE, parseComma, parseTREE, parseToken('}'))(text);
  }

  return parseSCRIPT(text);
};

const parseScriptToken =
  (type: ScriptType): Parser =>
  (text: string) => {
    const res = compose(parseToken(cmd(type)), parseToken('('))(text);
    return [{ type: TypeAST.SCRIPT, value: type, children: [] }, res[1]];
  };

const parseEndCmd = parseToken(')');
const parseComma = parseToken(',');

export const parseSCRIPT: Parser = (text: string) => {
  return oneOf(parseASM, parseRAW, parseELTR)(text);
};

const parseRAW = compose(
  parseScriptToken(ScriptType.RAW), // raw(
  parseHEX, // hex of any length
  parseEndCmd // ')'
);

const parseELTR = compose(
  parseScriptToken(ScriptType.ELTR), // eltr(
  parseKEY, // 64 hex chars
  parseComma, // ','
  parseTREE, // TREE
  parseEndCmd // ')'
);

const parseASM = compose(
  parseScriptToken(ScriptType.ASM), // asm(
  parseASMScript, // opcodes
  parseEndCmd // ')'
);
