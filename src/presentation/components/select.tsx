import { Listbox } from '@headlessui/react';

interface Props {
  list: string[];
  selected: string;
  onSelect: (v: string) => void;
  disabled: boolean;
  onClick?: () => void;
}

const Select: React.FC<Props> = ({ list, selected, onSelect, disabled, onClick }) => {
  return (
    <Listbox value={selected} onChange={onSelect} disabled={disabled}>
      {({ open }) => (
        <>
          <div
            onClick={() => {
              if (onClick) onClick();
            }}
          >
            <Listbox.Button className="border-primary ring-primary focus:ring-primary focus:border-primary focus:outline-none flex flex-row justify-between w-full px-3 py-2.5 border-2 rounded-md">
              <span className="font-md text-sm">{selected}</span>
              {open ? (
                <img src="assets/images/chevron-up.svg" alt="chevron" />
              ) : (
                <img
                  className="transform -rotate-90"
                  src="assets/images/chevron-left.svg"
                  alt="chevron"
                />
              )}
            </Listbox.Button>
          </div>
          {open && (
            <div>
              <Listbox.Options
                className="focus:outline-none px-3 py-2 text-left rounded-md shadow-lg"
                static
              >
                {list.map((item) => (
                  <Listbox.Option
                    className="focus:outline-none py-3 cursor-pointer"
                    key={item}
                    value={item}
                  >
                    {item}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          )}
        </>
      )}
    </Listbox>
  );
};

export default Select;
