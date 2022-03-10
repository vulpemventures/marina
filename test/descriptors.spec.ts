import { NodeType } from '../src/descriptors/ast';
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

        console.log(tree);
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
        const text = 'eltr(raw(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5),{raw(fff97bd5755eeea420453a14355235d382f6472f8568a18b2f057a1460297556),raw(e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13)})';
        const [tree, remainingText] = parseScript(text);

        expect(tree).toEqual({
            type: NodeType.ELTR,
            value: undefined,
            children: [
                {
                    type: NodeType.RAW,
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
    })
})