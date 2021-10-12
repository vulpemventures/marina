import React from 'react';
import MermaidLoader from './mermaid-loader';

const BACKGROUND_IMG = '/assets/images/popup/bg-home.png';

const PopupMermaidLoader: React.FC = () => {
  return (
    <main style={{ backgroundImage: `url(${BACKGROUND_IMG})` }}>
      <MermaidLoader className="flex items-center justify-center h-screen" />
    </main>
  );
};

export default React.memo(PopupMermaidLoader);
