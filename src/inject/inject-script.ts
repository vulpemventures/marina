// this is an inject script, "injected" in web pages
// this script set up window.marina provider

import CoinosProvider from './coinOS/provider';
import Marina from './marina/provider';

const marina = new Marina();
(window as Record<string, any>)[Marina.PROVIDER_NAME] = marina;
window.dispatchEvent(new Event(`${Marina.PROVIDER_NAME}#initialized`));

const coinos = new CoinosProvider();
(window as Record<string, any>)[CoinosProvider.PROVIDER_NAME] = coinos;
window.dispatchEvent(new Event(`${CoinosProvider.PROVIDER_NAME}#initialized`));
