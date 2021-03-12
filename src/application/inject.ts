import Marina from './marina';


const marina = new Marina();

window.dispatchEvent(new Event('marina#initialized'));
window.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded and parsed');
});
(window as Record<string, any>).marina = marina;



export { }