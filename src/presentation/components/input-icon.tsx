import React from 'react';

interface Props {
  className?: string;
  imgIconPath: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

const InputIcon: React.FC<Props> = ({ className = '', imgIconPath, onChange, placeholder }) => {
  return (
    <div className={`relative w-full ${className}`}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-2">
        <img src={imgIconPath} alt="search" />
      </span>
      <input
        className="border-primary ring-primary focus:ring-primary focus:border-primary w-full py-2 pl-10 bg-white border-2 rounded-md shadow"
        onChange={onChange}
        placeholder={placeholder}
        type="search"
      ></input>
    </div>
  );
};

export default InputIcon;
