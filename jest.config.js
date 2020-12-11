module.exports = {
  transform: {
    '.+\\.ts$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
  globals: {
    'ts-jest': {
      tsconfig: '__test__/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['./src/setupTests.ts'],
};
