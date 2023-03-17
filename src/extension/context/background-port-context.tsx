import { createContext, useContext } from 'react';
import type { BackgroundPort } from '../../port/background-port';
import { getBackgroundPortImplementation } from '../../port/background-port';

export interface BackgroundPortContextProps {
  backgroundPort: BackgroundPort;
}

const backgroundPort = getBackgroundPortImplementation();

const BackgroundPortContext = createContext<BackgroundPortContextProps>({
  backgroundPort,
});

export const BackgroundPortProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <BackgroundPortContext.Provider value={{ backgroundPort }}>
      {children}
    </BackgroundPortContext.Provider>
  );
};

export const useBackgroundPortContext = () => useContext(BackgroundPortContext);
