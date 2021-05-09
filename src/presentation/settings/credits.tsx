import React from 'react';
import ShellPopUp from '../components/shell-popup';
import { browser } from 'webextension-polyfill-ts';

const SettingsCredits: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Credits"
    >

      <h1 className="text-lg mt-4 font-medium">Mermaid illustration</h1>
      <p className="font-regular mt-2 text-base text-center">
        Created by <a className="text-primary" href="https://www.freepik.com/pikisuperstar" target="_blank">pikisuperstar</a>
      </p>

      <h1 className="text-lg mt-4 font-medium">Logo</h1>
      <p className="font-regular mt-2 text-base text-center">
        Inspired by <a className="text-primary" href="https://www.amazon.co.uk/Tobesonne-Mousepads-Drawing-Creature-Non-Slip/dp/B07L29WXPY" target="_blank">Tobesonne</a>
      </p>

      <h1 className="text-lg mt-4 font-medium">UI/UX</h1>
      <p className="font-regular mt-2 text-base text-center">
        Made by <a className="text-primary" href="https://alissadeleva.com" target="_blank">Alissa De Leva</a>
      </p>

      <h1 className="text-lg mt-4 font-medium">Development</h1>
      <p className="font-regular mt-2 text-base text-center">
        <a className="text-primary" href="https://github.com/Janaka-Steph" target="_blank">Stéphane Roche</a>, <a className="text-primary" href="https://github.com/altafan" target="_blank">Pietralberto Mazza</a>, <a className="text-primary" href="https://github.com/louisinger" target="_blank">Louis Singer</a>, <a className="text-primary" href="https://github.com/tiero" target="_blank">Marco Argentieri</a>
      </p>
    </ShellPopUp>
  );
};

export default SettingsCredits;
