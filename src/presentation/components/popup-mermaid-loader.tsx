import React from 'react';
import MermaidLoader from './mermaid-loader';

const PopupMermaidLoader: React.FC = () => {
  return (
    <main className="bg-popup-wave sm:bg-none">
      <MermaidLoader className="flex items-center justify-center h-screen" />
    </main>
  );
};

export default React.memo(PopupMermaidLoader);
