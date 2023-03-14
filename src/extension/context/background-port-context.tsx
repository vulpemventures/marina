import { createContext, useContext } from 'react';
import type { BackgroundPort } from '../../port/message';
import { PolyfillBackgroundPort } from '../../port/message';

export interface BackgroundPortContextProps {
  backgroundPort: BackgroundPort;
}

const BackgroundPortContext = createContext<BackgroundPortContextProps>({
  backgroundPort: PolyfillBackgroundPort,
});

export const BackgroundPortProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <BackgroundPortContext.Provider
      value={{
        backgroundPort: PolyfillBackgroundPort,
      }}
    >
      {children}
    </BackgroundPortContext.Provider>
  );
};

export const useBackgroundPortContext = () => useContext(BackgroundPortContext);
