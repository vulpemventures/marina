module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: '__test__/tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  setupFilesAfterEnv: ['./src/setupTests.ts'],
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  transform: {
    '.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(taxi-protobuf)/)"'],
};
