import { AccountType } from "../../domain/account";

// TODO account icons ??
function getImgFilename(type: AccountType): string {
    switch (type) {
        case AccountType.MainAccount:
            return 'circle.svg';
        case AccountType.CustomScriptAccount:
            return 'circle.svg';
        default:
            return 'circle.svg'; 
    }
}

const accountIcon: React.FC<{ type: AccountType }> = ({ type }) => {
  return (
    <img
      className="w-8 mr-1.5"
      src={`assets/images/${getImgFilename(type)}`}
      alt="receive transaction"
    />
  );
};

export default accountIcon;
