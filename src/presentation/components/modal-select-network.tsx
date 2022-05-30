import React, { useRef } from 'react';
import useOnClickOutside from '../hooks/use-onclick-outside';

interface Props {
  isOpen: boolean;
  onClose: () => any;
  onLightning: any;
  onLiquid: any;
}

const ModalSelectNetwork: React.FC<Props> = ({ isOpen, onClose, onLightning, onLiquid }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useOnClickOutside(ref, onClose);

  if (!isOpen) return <></>;

  return (
    <div className="fixed bottom-0 z-50 flex">
      <div className="min-h-60 p-8 m-auto bg-white rounded-t-lg shadow-md" ref={ref}>
        <div className="flex flex-col justify-between flex-1">
          <h1 className="mb-4 text-lg">Select network</h1>
          <div className="flex justify-center">
            <div className="h-15 p-2" onClick={onLiquid}>
              <img
                className="h-10 mt-0.5 block mx-auto mb-2"
                src={'assets/images/networks/liquid.svg'}
                alt="liquid network logo"
              />
              <p className="text-xs">Liquid Network</p>
            </div>
            <div className="h-15 p-2" onClick={onLightning}>
              <img
                className="h-10 mt-0.5 block mx-auto mb-2"
                src={'assets/images/networks/lightning.svg'}
                alt="lightning network logo"
              />
              <p className="text-xs">Lightning Network</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalSelectNetwork;
