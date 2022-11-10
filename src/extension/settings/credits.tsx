import React from 'react';
import ShellPopUp from '../components/shell-popup';

const SettingsCredits: React.FC = () => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Credits"
    >
      <h1 className="mt-4 text-lg font-medium">UI/UX</h1>
      <p className="font-regular mt-2 text-base text-center">
        Made by{' '}
        <a
          className="text-primary"
          href="https://alissadeleva.com"
          rel="noreferrer"
          target="_blank"
        >
          Alissa De Leva
        </a>
      </p>

      <h1 className="mt-4 text-lg font-medium">Development</h1>
      <p className="font-regular mt-2 text-base text-center">
        <a
          className="text-primary"
          href="https://github.com/Janaka-Steph"
          rel="noreferrer"
          target="_blank"
        >
          Stéphane Roche
        </a>
        ,{' '}
        <a
          className="text-primary"
          href="https://github.com/altafan"
          target="_blank"
          rel="noreferrer"
        >
          Pietralberto Mazza
        </a>
        ,{' '}
        <a
          className="text-primary"
          href="https://github.com/louisinger"
          target="_blank"
          rel="noreferrer"
        >
          Louis Singer
        </a>
        ,{' '}
        <a
          className="text-primary"
          href="https://github.com/tiero"
          rel="noreferrer"
          target="_blank"
        >
          Marco Argentieri
        </a>
      </p>

      <h1 className="mt-4 text-lg font-medium">Mermaid illustration</h1>
      <p className="font-regular mt-2 text-base text-center">
        Created by{' '}
        <a
          className="text-primary"
          href="https://www.freepik.com/pikisuperstar"
          rel="noreferrer"
          target="_blank"
        >
          pikisuperstar
        </a>
      </p>

      <h1 className="mt-4 text-lg font-medium">Logo</h1>
      <p className="font-regular mt-2 text-base text-center">
        Inspired by{' '}
        <a
          className="text-primary"
          href="https://www.amazon.co.uk/Tobesonne-Mousepads-Drawing-Creature-Non-Slip/dp/B07L29WXPY"
          rel="noreferrer"
          target="_blank"
        >
          Tobesonne
        </a>
      </p>
    </ShellPopUp>
  );
};

export default SettingsCredits;
