import Marina from './marina';


const marina = new Marina();

(window as Record<string, any>).marina = marina;
window.dispatchEvent(new Event('marina#initialized'));
