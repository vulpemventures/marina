import React from 'react';

interface Props {
  children?: React.ReactElement | React.ReactElement[];
  title: string;
  titleColor?: string;
  emptyText: string;
}

const ButtonList: React.FC<Props> = ({ children, title, titleColor, emptyText }: Props) => {
  return (
    <div className="h-full">
      <h2 className={`mt-2 text-lg font-medium text-left text-${titleColor ?? 'white'}`}>
        {title}
      </h2>
      <div className="h-full overflow-y-auto" id="btn-list">
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
