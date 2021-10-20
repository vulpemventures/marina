import React from 'react';
import Shell from '../components/shell';

const PairSuccess: React.FC = () => {
  return (
    <Shell hasBackBtn={false}>
      <p>New account successfully restored and add to Marina! You can close this page.</p>
      <img className="w-72 mb-14 mt-10" src="/assets/images/mermaid.png" alt="mermaid" />
    </Shell>
  );
};

export default PairSuccess;
