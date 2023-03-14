import { createContext, useContext } from 'react';
import type { BackgroundPort } from '../../port/message';
import { getBackgroundPortImplementation } from '../../port/message';

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
