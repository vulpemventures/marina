import React from 'react';
import { Spinner } from './spinner';

interface Props {
  children?: React.ReactElement | React.ReactElement[];
  title?: string;
  titleColor?: string;
  emptyText: string;
  loading?: boolean;
  loadingText?: string;
}

const ButtonList: React.FC<Props> = ({
  children,
  title,
  titleColor,
  emptyText,
  loading,
  loadingText,
}: Props) => {
  return (
    <div className="h-full">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="animate-pulse m-1 text-white">{loadingText || 'Loading'}</p>
          <Spinner color="#fefefe" />
        </div>
      ) : (
        <>
          {title && (
            <h2 className={`mt-2 text-lg font-medium text-left text-${titleColor ?? 'white'}`}>
              {title}
            </h2>
          )}
          <div className="h-full overflow-y-auto" id="btn-list">
            <div className="py-4 space-y-4">
              {React.Children.count(children) === 0 ? (
                <span className="text-sm font-medium text-white">{emptyText}</span>
              ) : (
                children
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ButtonList;
