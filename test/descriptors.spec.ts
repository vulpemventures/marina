import { script  } from 'liquidjs-lib';
import { compile, NodeType } from '../src/descriptors/ast';
import {parseScript } from '../src/descriptors/parser'

describe('parser', () => {
    it('should parse raw template', () => {
        const text = 'raw(08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a)';
        const [tree, remainingText] = parseScript(text);

        expect(tree).toEqual({
            type: NodeType.RAW,
            value: '08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a',
            children: [],
        });
        expect(remainingText).toEqual('');
    })

    it('should parse elp2wsh template', () => {
        const text = 'elp2wsh(raw(08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a))';
        const [tree, remainingText] = parseScript(text);

        expect(tree).toEqual({
            type: NodeType.ELP2WSH,
            value: undefined,
            children: [
                {
                    type: NodeType.RAW,
                    value: '08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a',
                    children: [],
                },
            ],
        });
        expect(remainingText).toEqual('');
    })

    it('should parse eltr template', () => {
        const text = 'eltr(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5,{raw(fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556),raw(e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13)})';
        const [tree, remainingText] = parseScript(text);

        expect(tree).toEqual({
            type: NodeType.ELTR,
            value: undefined,
            children: [
                {
                    type: NodeType.KEY,
                    value: 'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
                    children: [],
                },
                {
                    type: NodeType.TREE_NODE,
                    value: undefined,
                    children: [
                        {
                            type: NodeType.RAW,
                            value: 'fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556',
                            children: [],
                        },
                        {
                            type: NodeType.RAW,
                            value: 'e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
                            children: [],
                        },
                    ],
                },
            ],
        });
        expect(remainingText).toEqual('');

        const res = compile(tree!);
        expect(res.redeemScript.toString('hex')).toEqual('51200ef0975c80e0ff6cc3ef4c02944329bb9cea26c54db74ff1919bb3dfb75b980f');
        expect(res.getWitnesses).toBeDefined();
        expect(res.getWitnesses!('fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556').map(b => b.toString('hex')))
            .toEqual([
                'fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556',
                'c4c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5978752a16e4be9a633eaa7eb45580a6a2470aefe536ef541348df57186dbefd5'
            ]);

        expect(res.getWitnesses!('e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13').map(b => b.toString('hex')))
            .toEqual([
                'e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
                'c4c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee55bfb6773261ad663908d570c3e53f529f3ec9b1ad8eefa9cfbc353023c2e01de'
            ]);
    })

    it('should parse asm template', () => {
        const text = 'asm(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5 OP_CHECKSIG)';
        const [tree, remainingText] = parseScript(text);
        expect(tree).toEqual({
            type: NodeType.ASM,
            value: script.fromASM('c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5 OP_CHECKSIG').toString('hex'),
            children: [],
        });
        expect(remainingText).toEqual('');
    })
})