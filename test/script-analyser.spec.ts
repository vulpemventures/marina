import { script } from 'ldk';
import type { ScriptInputsNeeds } from '../src/domain/script-analyser';
import { analyse } from '../src/domain/script-analyser';

interface AnalyzerTest {
  scriptASM: string;
  expected: ScriptInputsNeeds;
}

const TESTS: AnalyzerTest[] = [
  {
    scriptASM: 'OP_HASH160 OP_EQUALVERIFY',
    expected: {
      sigs: [],
      hasIntrospection: false,
      needParameters: true,
    },
  },
  {
    scriptASM: 'ca44d0e46b2a09e3c57981a6b8ae679e35f44dceff0bebe6ae31104db7dbac0c OP_CHECKSIG',
    expected: {
      sigs: [{ pubkey: 'ca44d0e46b2a09e3c57981a6b8ae679e35f44dceff0bebe6ae31104db7dbac0c' }],
      hasIntrospection: false,
      needParameters: false,
    },
  },
  {
    scriptASM:
      'OP_INSPECTINPUTOUTPOINT OP_FALSE ca44d0e46b2a09e3c57981a6b8ae679e35f44dceff0bebe6ae31104db7dbac0c OP_CHECKSIG',
    expected: {
      sigs: [{ pubkey: 'ca44d0e46b2a09e3c57981a6b8ae679e35f44dceff0bebe6ae31104db7dbac0c' }],
      hasIntrospection: true,
      needParameters: false,
    },
  },
  {
    scriptASM:
      'ca44d0e46b2a09e3c57981a6b8ae679e35f44dceff0bebe6ae31104db7dbac0c OP_CHECKSIG c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5 OP_CHECKSIG',
    expected: {
      sigs: [
        { pubkey: 'ca44d0e46b2a09e3c57981a6b8ae679e35f44dceff0bebe6ae31104db7dbac0c' },
        { pubkey: 'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5' },
      ],
      hasIntrospection: false,
      needParameters: false,
    },
  },
];

describe('script-analyzer tests', () => {
  TESTS.forEach((test) => {
    it(`should analyse ${test.scriptASM}`, () => {
      const s = script.fromASM(test.scriptASM).toString('hex');
      const result = analyse(s);
      expect(result).toEqual(test.expected);
    });
  });
});
