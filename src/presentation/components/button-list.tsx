import React from 'react';

interface Props {
  children?: React.ReactElement | React.ReactElement[];
  title: string;
  emptyText: string;
}

const ButtonList: React.FC<Props> = ({ children, title, emptyText }: Props) => {
  return (
    <div>
      <h2 className="mt-2 text-lg font-medium text-left text-white">{title}</h2>
      <div className="h-64 overflow-y-auto" id="btn-list">
        <div className="py-4 space-y-4">
          {React.Children.count(children) === 0 ? (
            <span className="text-sm font-medium text-white">{emptyText}</span>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
};

export default ButtonList;
