import React, { useEffect } from 'react';

const useOnClickOutside = (
  ref: React.MutableRefObject<HTMLDivElement | null>,
  handler: (event: TouchEvent | MouseEvent) => void
) => {
  useEffect(() => {
    const listener = (event: TouchEvent | MouseEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

export default useOnClickOutside;
