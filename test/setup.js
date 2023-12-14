// this file is executed before Jest runs your tests
// it disables console.log and console.debug in tests (mostly to avoid WsElectrum debug logs noise)
global.console = {
  ...console,
  log: jest.fn(), // console.log are ignored in tests
  debug: jest.fn(), // console.debug are ignored in tests
};
