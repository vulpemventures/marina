import { expect } from 'chai';
import { MarinaProvider } from 'marina-provider';

const extension = require('@poziworld/cypress-browser-extension-plugin/helpers')();

describe('My First Test', () => {
  it('Does not do much!', async () => {
    const url = 'https://louisinger.github.io/marina-api-test-app/';
    cy.visit(url);
    cy.get('button').click();
    cy.wait(2000);

    cy.get('.App')
      .find('.success')
      .should('have.length', 10)

    cy.get('.App')
      .find('.error')
      .should('have.length', 0)
  });
});