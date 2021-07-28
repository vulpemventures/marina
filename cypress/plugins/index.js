/// <reference types="cypress" />

const path = require('path');

const extensionLoader = require('@poziworld/cypress-browser-extension-plugin/loader');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on) => {
  on('before:browser:launch', extensionLoader.load(getMarinaAbsoluteDirname()));
};

function getMarinaAbsoluteDirname() {
  const splitted = __dirname.split('/');
  splitted.pop(); // remove "plugins"
  splitted.pop(); // remove "cypress"
  return path.resolve('/', ...splitted, 'dist');
}
