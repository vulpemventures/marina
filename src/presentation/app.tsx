import React from 'react';
import { HashRouter } from 'react-router-dom';
import Routes from './routes';
import useLottieLoader from './hooks/use-lottie-loader';

const App: React.FC = () => {
  // Populate ref div with svg animation
  const mermaidLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');

  return (
    <HashRouter hashType="noslash">
      <Routes />
    </HashRouter>
  );
};

export default App;
