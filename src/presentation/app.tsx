import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';
import Routes from './routes';
import useLottieLoader from './hooks/use-lottie-loader';

const App: React.FC = () => {
  // Populate ref div with svg animation
  const mermaidLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');

  // if (!fetchedFromRepo) {
  //   return <div className="flex items-center justify-center h-screen p-8" ref={mermaidLoaderRef} />;
  // }

  return (
    <HashRouter hashType="noslash">
      <Routes />
    </HashRouter>
  );
};

export default App;
