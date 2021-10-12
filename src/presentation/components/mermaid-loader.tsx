import React from 'react';
import useLottieLoader from '../hooks/use-lottie-loader';

interface MermaidLoaderProps {
  className: string;
  backgroundImagePath?: string;
}

const MermaidLoader: React.FC<MermaidLoaderProps> = ({ className }) => {
  // Populate ref div with svg animation
  const mermaidLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');

  return <div className={className} ref={mermaidLoaderRef} />;
};

export default MermaidLoader;
