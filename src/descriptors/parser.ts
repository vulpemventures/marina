import { AST, NodeType } from "./ast";
import { readHex } from "./utils";

const EXPECT_TOKEN = (token: string) => new Error(`Expected ${token}`);

function cmd(type: NodeType): string {
    switch (type) {
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

function combineParser(...parsers: Parser[]): Parser {
    return (text: string) => {
        let result: AST | undefined;
        let remainingText = text;
        for (const parser of parsers) {
            const [child, text] = parser(remainingText);
            if (child) {
                if (result) {
                    result.children.push(child);
                } else {
                    result = child;
                }
            }
            remainingText = text;
        }

        return [result, remainingText];
    }
}

const parseRawHex: Parser = (text: string) => {
    const [hex, remainingText] = readHex(text);
    return [{ type: NodeType.RAW, value: hex, children: [] }, remainingText];
}

// parse a token, does not create any AST node
const parseToken = (token: string): Parser => (text: string) => {
    if (text.startsWith(token)) {
        return [undefined, text.slice(token.length)];
    }

    throw EXPECT_TOKEN(token);
}

const parseTreeStart: Parser = (text: string) => {
    const [, remainingText] = parseToken('{')(text);
    return [{ type: NodeType.TREE_NODE, value: undefined, children: [] }, remainingText];
}

// tree parser
const parseTree: Parser = (text: string) => {
    if (text.startsWith('{')) {
        return combineParser(
            parseTreeStart,
            parseTree,
            parseComma,
            parseTree,
            parseToken('}'),
        )(text);
    }
     
    return parseScript(text);
}

const parseStartCmd = (type: NodeType, hasChildren = false): Parser => (text: string) => {
    const res = parseToken(`${cmd(type)}(`)(text);
    if (!hasChildren) return res;
    return [{ type, value: undefined, children: [] }, res[1]];
}

const parseEndCmd = parseToken(')');
const parseComma = parseToken(',');

export const parseScript = (text: string): [AST | undefined, string] => {
    if (text.startsWith(cmd(NodeType.RAW))) {
        return parseRAW(text);
    }

    if (text.startsWith(cmd(NodeType.ELP2WSH))) {
        return parseELP2WSH(text);
    }

    if (text.startsWith(cmd(NodeType.ELTR))) {
        return parseELTR(text);
    }

    throw "invalid input";
}

const parseRAW = combineParser(
    parseStartCmd(NodeType.RAW),
    parseRawHex,
    parseEndCmd,
);

const parseELP2WSH = combineParser(
    parseStartCmd(NodeType.ELP2WSH, true),
    parseScript,
    parseEndCmd,
);

const parseELTR = combineParser(
    parseStartCmd(NodeType.ELTR, true),
    parseScript,
    parseComma,
    parseTree,
    parseEndCmd,
);