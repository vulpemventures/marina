import { expect } from 'chai';
import { MarinaProvider } from 'marina-provider';
import { parse, stringify } from '../../src/application/utils/browser-storage-converters';

const extension = require('@poziworld/cypress-browser-extension-plugin/helpers')();

// @ts-ignore
const injectedMarina = window.marina as MarinaProvider;

describe('My First Test', () => {
  it('Does not do much!', async () => {
    const url = 'https://google.com';
    cy.visit(url);

    await enableSiteViaStorage(url);

    const connectData = (await extension.getStorage('local', "persist:connect"))["persist:connect"];
    const enabledSites = parse(parse(connectData)).enabledSites;


    const isEnabled = await injectedMarina.isEnabled();

    expect(isEnabled).to.equal(true, enabledSites);
  });
});

async function enableSiteViaStorage(hostname: string) {
  const value = { ["persist:connect"]: stringify(stringify({ liquid: [hostname], regtest: [hostname] })) }
  await extension.setStorage('local', { key: 'persist:connect', value })
}