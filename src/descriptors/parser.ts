import { AST, NodeType } from './ast';
import { readHex, readUntil } from './utils';
import { script } from 'liquidjs-lib';

const EXPECT_TOKEN = (token: string) => new Error(`Expected ${token}`);

function cmd(type: NodeType): string {
  switch (type) {
    case NodeType.ASM:
      return 'asm';
    case NodeType.RAW:
      return 'raw';
    case NodeType.ELP2WSH:
      return 'elp2wsh';
    case NodeType.ELTR:
      return 'eltr';
    default:
      throw new Error(`not a command node: ${type}`);
  }
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

const parseRawHex: Parser = (text: string) => {
  const [hex, remainingText] = readHex(text);
  return [{ type: NodeType.RAW, value: hex, children: [] }, remainingText];
};

const parseKey: Parser = (text: string) => {
  const [hex, remainingText] = readHex(text);
  if (hex.length !== 64) {
    throw EXPECT_TOKEN('key (hex string with len=64)');
  }

  return [{ type: NodeType.KEY, value: hex, children: [] }, remainingText];
};

const parseASMScript: Parser = (text: string) => {
  const [asm, remainingText] = readUntil(text, ')');
  const asmScript = script.fromASM(asm);
  return [{ type: NodeType.ASM, value: asmScript.toString('hex'), children: [] }, remainingText];
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

const parseTreeStart: Parser = (text: string) => {
  const [, remainingText] = parseToken('{')(text);
  return [{ type: NodeType.TREE_NODE, value: undefined, children: [] }, remainingText];
};

// tree parser
const parseTree: Parser = (text: string) => {
  if (text.startsWith('{')) {
    return compose(parseTreeStart, parseTree, parseComma, parseTree, parseToken('}'))(text);
  }

  return parseScript(text);
};

const parseStartCmd =
  (type: NodeType, hasChildren = false): Parser =>
  (text: string) => {
    const res = parseToken(`${cmd(type)}(`)(text);
    if (!hasChildren) return res;
    return [{ type, value: undefined, children: [] }, res[1]];
  };

const parseEndCmd = parseToken(')');
const parseComma = parseToken(',');

export const parseScript: Parser = (text: string) => {
  return oneOf(parseASM, parseRAW, parseELP2WSH, parseELTR)(text);
};

const parseRAW = compose(parseStartCmd(NodeType.RAW), parseRawHex, parseEndCmd);

const parseELP2WSH = compose(parseStartCmd(NodeType.ELP2WSH, true), parseScript, parseEndCmd);

const parseELTR = compose(
  parseStartCmd(NodeType.ELTR, true),
  parseKey,
  parseComma,
  parseTree,
  parseEndCmd
);

const parseASM = compose(parseStartCmd(NodeType.ASM), parseASMScript, parseEndCmd);
