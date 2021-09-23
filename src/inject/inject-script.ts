// this is an inject script, "injected" in web pages
// this script set up window.marina provider

import Marina from './marina';

const marina = new Marina();
(window as Record<string, any>)[Marina.PROVIDER_NAME] = marina;
window.dispatchEvent(new Event(`${Marina.PROVIDER_NAME}#initialized`));
