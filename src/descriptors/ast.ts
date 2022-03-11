import { sha256Hash } from "../application/utils/crypto";
import { bip341 } from 'liquidjs-lib';

export enum NodeType {
    ASM = 0,
    RAW = 1,
    ELP2WSH = 2,
    ELTR = 3,
    TREE_NODE = 4,
    KEY = 5, // 64bits hex
}

// Abstract syntax tree
export interface AST {
    type: NodeType;
    value: any;
    children: AST[];
}


// result is the last output of AST
// template string --parser--> AST --compiler--> Result object
export interface Result {
    // witness stack needed to sign the template
    witnesses?: Buffer[];
    // instead of returning a witness stack, we can return a custom function computing the stack
    // this is useful in case of taproot templates
    getWitnesses?: ((...args: any[]) => Buffer[]); 
    redeemScript: Buffer; // redeem script for the template
}

type CompileFunction = (ast: AST) => Result;

// 'raw' node
function compileRAW(ast: AST): Result {
    if (ast.type !== NodeType.RAW) {
        throw new Error('Expected raw node');
    }

    return {
        witnesses: [],
        redeemScript: Buffer.from(ast.value, 'hex'),
    }
}

// 'asm' node, which is a subset of raw
function compileASM(ast: AST): Result {
    if (ast.type !== NodeType.ASM) {
        throw new Error('Expected asm node');
    }

    return {
        witnesses: [],
        redeemScript: Buffer.from(ast.value, 'hex'),
    }
}

// 'elp2wsh' node
function compileELP2WSH(ast: AST): Result {
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

function treeNodeToLeaves(ast: AST): bip341.TaprootLeaf[] {
    if (ast.type !== NodeType.TREE_NODE) {
        throw new Error('Expected tree node');
    }

    const leaves: bip341.TaprootLeaf[] = [];
    
    for (const child of ast.children) {
        if (child.type === NodeType.TREE_NODE) {
            leaves.push(...treeNodeToLeaves(child));
        } else {
            const compiledScript = compile(child);
            leaves.push({
                scriptHex: compiledScript.redeemScript.toString('hex'),
            });
        }
    }

    return leaves;
}

function compileELTR(ast: AST): Result {
    if (ast.type !== NodeType.ELTR) {
        throw new Error('Expected eltr node');
    }

    if (ast.children[0].type !== NodeType.KEY) {
        throw new Error('Expected key as first argument of eltr');
    }

    if (ast.children[1].type !== NodeType.TREE_NODE) {
        throw new Error('Expected key as second argument of eltr');
    }

    const internalKey = Buffer.from(ast.children[0].value, 'hex');
    const leaves = treeNodeToLeaves(ast.children[1]);
    const tree = bip341.toHashTree(leaves);

    // this is a trick for the bip341 functions (accept only prefixed keys)
    const prefixedInternalKey = Buffer.concat([Buffer.of(0x00), internalKey]);
    
    const redeemScript = bip341.taprootOutputScript(prefixedInternalKey, tree)

    return {
        getWitnesses:  (leafScript: string): Buffer[] => {
            const leaf = leaves.find(l => l.scriptHex === leafScript);
            if (!leaf) {
                throw new Error('Could not find leaf script');
            }
            
            const path = bip341.findScriptPath(tree, bip341.tapLeafHash(leaf))
            return bip341.taprootSignScriptStack(prefixedInternalKey, leaf, tree.hash, path)
        },
        redeemScript,
    };
}

// map cmd to compile functions
const compileFunctions: Map<NodeType, CompileFunction> = new Map([
    [NodeType.RAW, compileRAW],
    [NodeType.ASM, compileASM],
    [NodeType.ELP2WSH, compileELP2WSH],
    [NodeType.ELTR, compileELTR],
])

// main compile function
export function compile(ast: AST): Result {
    const compileFunction = compileFunctions.get(ast.type);
    if (!compileFunction) {
        throw new Error(`node type: ${ast.type} is not compilable, u should probably use it inside a cmd`);
    }

    return compileFunction(ast);
}