import React from 'react';

interface Props {
  className?: string;
  imgIconAlt: string;
  imgIconPath: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type: string;
}

const InputIcon: React.FC<Props> = ({
  className = '',
  imgIconAlt,
  imgIconPath,
  onChange,
  placeholder,
  type,
}) => {
  return (
    <div className={`relative w-full z-10 ${className}`}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-2">
        <img src={imgIconPath} alt={imgIconAlt} />
      </span>
      <input
        className="border-primary ring-primary focus:ring-primary focus:border-primary w-full py-2 pl-10 bg-white border-2 rounded-md shadow"
        onChange={onChange}
        placeholder={placeholder}
        type={type}
      ></input>
    </div>
  );
};

export default InputIcon;
