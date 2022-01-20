module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'test/tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node',
  testRegex: '\\.(test|spec)\\.ts$',
  transform: {
    '.+\\.ts$': 'ts-jest',
  },
};
