import React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface Props {
  children?: React.ReactElement[];
  title: string;
  emptyText: string;
}

const ButtonList: React.FC<Props> = ({ children, title, emptyText }: Props) => {
  const Row: React.FC<ListChildComponentProps<React.ReactElement[]>> = ({ index, style, data }) => (
    <div style={style}>{data[index]}</div>
  );

  return (
    <div className="h-full">
      <h2 className="mt-2 text-lg font-medium text-left text-white">{title}</h2>
      {React.Children.count(children) === 0 ? (
        <span className="text-sm font-medium text-white">{emptyText}</span>
      ) : (
        <AutoSizer>
          {({ height, width }) => (
            <List
              className="btn-list pr-2"
              height={height}
              width={width + 10}
              itemCount={React.Children.count(children)}
              itemData={children}
              itemSize={65}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      )}
    </div>
  );
};

export default ButtonList;
