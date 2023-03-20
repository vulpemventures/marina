module.exports = {
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node',
  testRegex: '\\.(test|spec)\\.ts$',
  transform: {
    '.+\\.ts$': ['ts-jest', { tsconfig: 'test/tsconfig.json' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(taxi-protobuf)/)"'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
};
