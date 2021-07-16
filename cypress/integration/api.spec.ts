import { testAppURL } from './../../src/application/constants/cypress';

describe('My First Test', () => {
  it('Marina test app API should pass', async () => {
    cy.visit(testAppURL);
    cy.get('button').click();
    cy.wait(2000);

    cy.get('.App')
      .find('.success')
      .should('have.length', 11)

    cy.get('.App')
      .find('.error')
      .should('have.length', 0)
  });
});