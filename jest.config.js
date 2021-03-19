module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'test/tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  setupFilesAfterEnv: ['./test/jest-setup.ts'],
  testEnvironment: 'node',
  testRegex: '\\.(test|spec)\\.ts$',
  transform: {
    '.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(taxi-protobuf)/)"'],
};
