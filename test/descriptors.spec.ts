import { compile, ScriptType, TypeAST } from '../src/descriptors/ast';
import { parseSCRIPT } from '../src/descriptors/parser';
import type { Context } from '../src/descriptors/preprocessing';
import { preprocessor } from '../src/descriptors/preprocessing';
import { evaluate } from '../src/descriptors';
import { toXpub, script } from 'ldk';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

describe('evaluate', () => {
  it('should replace namespace tokens', () => {
    const xpub =
      'vpub5SLqN2bLY4WeaAsje9qzuLmXM3DYdtxWYG2PipZAki3fbdCfpum3hf4ZVgigwfJGk3BT9KvSpUkqNEJhdHQjXdqjSRxYq7AETSXPjVH7UMq';
    const text = `asm(OP_DUP OP_HASH160 $marina OP_EQUALVERIFY OP_CHECKSIG)`;
    const key = BIP32Factory(ecc)
      .fromBase58(toXpub(xpub))
      .derivePath('0/1')
      .publicKey.toString('hex');
    const ctx: Context = {
      namespaces: new Map().set('marina', { pubkey: key }),
    };

    const processedText = preprocessor(ctx, text);

    expect(processedText).toEqual(`asm(OP_DUP OP_HASH160 ${key} OP_EQUALVERIFY OP_CHECKSIG)`);
    const result = evaluate(ctx, text);
    expect(result.scriptPubKey()).toEqual(
      script.fromASM(`OP_DUP OP_HASH160 ${key} OP_EQUALVERIFY OP_CHECKSIG`)
    );
  });
});

describe('parser', () => {
  it('should parse raw template', () => {
    const text = 'raw(08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a)';
    const [tree, remainingText] = parseSCRIPT(text);

    expect(tree).toEqual({
      type: TypeAST.SCRIPT,
      value: ScriptType.RAW,
      children: [
        {
          type: TypeAST.HEX,
          value: '08e53a2e9e3ed3ba34dd5ce7f94e1e62abc3549e2d8796d8cd01102a23af1a',
          children: [],
        },
      ],
    });
    expect(remainingText).toEqual('');
  });

  it('should parse eltr template', () => {
    const text =
      'eltr(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5,{asm(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5 OP_CHECKSIG),asm(d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85a OP_CHECKSIG)})';
    const [tree, remainingText] = parseSCRIPT(text);

    expect(tree).toEqual({
      type: TypeAST.SCRIPT,
      value: ScriptType.ELTR,
      children: [
        {
          type: TypeAST.KEY,
          value: 'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
          children: [],
        },
        {
          type: TypeAST.TREE,
          value: undefined,
          children: [
            {
              type: TypeAST.SCRIPT,
              value: ScriptType.ASM,
              children: [
                {
                  type: TypeAST.HEX,
                  value: '20c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5ac',
                  children: [],
                },
              ],
            },
            {
              type: TypeAST.SCRIPT,
              value: ScriptType.ASM,
              children: [
                {
                  type: TypeAST.HEX,
                  value: '20d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85aac',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(remainingText).toEqual('');

    const res = compile(tree!);
    expect(res.scriptPubKey().toString('hex')).toEqual(
      '5120ec2e5b3649abf837992e92c55361ed2089a633cb69b540e90a0d098c88f0891f'
    );
    // expect(res.witnesses).toBeDefined();
    expect(res.taprootHashTree).toBeDefined();
    expect(
      res.witnesses!('20d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85aac').map(
        (b) => b.toString('hex')
      )
    ).toEqual([
      '20d01115d548e7561b15c38f004d734633687cf4419620095bc5b0f47070afe85aac',
      'c4c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee52a0a73facb720b9fdea8938ab1315cd66caf024eaa3c18ed79e7491bc3959767',
    ]);
    expect(
      res.witnesses!('20c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5ac').map(
        (b) => b.toString('hex')
      )
    ).toEqual([
      '20c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5ac',
      'c4c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5da5e27c17a7d951b00e01d1ad070d5f32175dec2511390644ae3b6caca14338a',
    ]);
  });
});
