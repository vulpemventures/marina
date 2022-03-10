import { sha256Hash } from "../application/utils/crypto";

export enum NodeType {
    RAW = 1,
    ELP2WSH = 2,
    ELTR = 3,
    TREE_NODE = 4,
}

// Abstract syntax tree
export interface AST {
    type: NodeType;
    value: any;
    children: AST[];
}

export interface CompileResult {
    witnesses: Buffer[]; // witness stack needed to sign the template
    redeemScript: Buffer; // redeem script for the template
}

type CompileFunction = (ast: AST) => CompileResult;

// 'raw' node
function compileRAW(ast: AST): CompileResult {
    if (ast.type !== NodeType.RAW) {
        throw new Error('Expected raw node');
    }

    return {
        witnesses: [],
        redeemScript: Buffer.from(ast.value, 'hex'),
    }
}

// 'elp2wsh' node
function compileELP2WSH(ast: AST): CompileResult {
    if (ast.type !== NodeType.ELP2WSH) {
        throw new Error('Expected elp2wsh node');
    }

    if (ast.children.length !== 1) {
        throw new Error('Expected elp2wsh node with one child');
    }

    const child = ast.children[0];
    const childResult = compile(child);   
    const redeemScript = Buffer.concat([
        Buffer.of(0x00), // witness v0
        Buffer.from(sha256Hash(childResult.redeemScript), 'hex')
    ]) 

    return {
        witnesses: [childResult.redeemScript],
        redeemScript,
    };
}

// map cmd to compile functions
const compileFunctions: Map<NodeType, CompileFunction> = new Map([
    [NodeType.RAW, compileRAW],
    [NodeType.ELP2WSH, compileELP2WSH],
])

// main compile function
export function compile(ast: AST): CompileResult {
    const compileFunction = compileFunctions.get(ast.type);
    if (!compileFunction) {
        throw new Error(`Unsupported node type: ${ast.type}`);
    }

    return compileFunction(ast);
}