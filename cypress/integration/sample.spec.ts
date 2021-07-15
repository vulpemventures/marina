import { expect } from 'chai';
import { MarinaProvider } from 'marina-provider';

const extension = require('@poziworld/cypress-browser-extension-plugin/helpers')();

// @ts-ignore
const injectedMarina = window.marina as MarinaProvider;

describe('My First Test', () => {
  it('Does not do much!', async () => {
    const url = 'https://louisinger.github.io/marina-api-test-app/';
    cy.visit(url);

    const isEnabled = await injectedMarina.isEnabled();
    expect(isEnabled).to.equal(true);
  });
});