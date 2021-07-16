import { testAppURL } from './../../src/application/constants/cypress';

describe('My First Test', () => {
  it('Does not do much!', async () => {
    cy.visit(testAppURL);
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