module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: '__test__/tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  setupFilesAfterEnv: ['./__test__/jest-setup.ts'],
  testEnvironment: 'node',
  testRegex: '\\.(test|spec)\\.ts$',
  transform: {
    '.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(taxi-protobuf)/)"'],
};
