const WarningDeleteMnemonic: React.FC = () => (
  <div className="bg-red bg-opacity-80 text-md text flex justify-between p-4 text-white align-middle border-0.5 rounded shadow-lg">
    <div>
      <img alt="warning" className="w-12" src="/assets/images/warning.svg" />
    </div>
    <div className="self-center ml-2">
      <span>There is already a mnemonic on this browser. </span>
      <br />
      <span>Restoring a new wallet will delete that one. </span>
      <br />
      <span>
        Make sure you have a safe backup of the mnemonic words before creating a new wallet
      </span>
    </div>
  </div>
);

export default WarningDeleteMnemonic;
