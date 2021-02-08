import React, { useContext, useEffect } from 'react';
import { useHistory } from 'react-router';
import { DEFAULT_ROUTE, SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import ButtonAsset from '../../components/button-asset';
import InputIcon from '../../components/input-icon';
import ShellPopUp from '../../components/shell-popup';
import assets from '../../../../__test__/fixtures/assets.json';
import { AppContext } from '../../../application/store/context';
import { flush, setAsset } from '../../../application/store/actions/transaction';

const SelectAsset: React.FC = () => {
  const history = useHistory();
  const [, dispatch] = useContext(AppContext);

  // Filter assets
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<
    [assetName: string, assetTicker: string, index: number][]
  >([]);

  useEffect(() => {
    const terms: [string, string, number][] = assets.map(({ assetName, assetTicker }, index) => [
      assetName,
      assetTicker,
      index,
    ]);

    const results = terms.filter((t) => {
      return (
        t[0].toLowerCase().replace('-', '').includes(searchTerm) ||
        t[1].toLowerCase().replace('-', '').includes(searchTerm)
      );
    });
    setSearchResults(results);
  }, [searchTerm]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase().replace('-', '');
    setSearchTerm(searchTerm);
  };

  const handleSend = ({ assetHash }: { [key: string]: string }) => {
    dispatch(setAsset(assetHash));
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };
  const handleBackBtn = () => {
    history.push(DEFAULT_ROUTE);
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-wave-bottom-sm.png"
      className="h-popupContent bg-primary container mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Select asset"
    >
      <InputIcon
        className="my-8"
        imgIconPath="assets/images/search.svg"
        imgIconAlt="search"
        onChange={handleChange}
        type="search"
      />

      <div className="h-25.75 overflow-y-scroll">
        <div className="pb-4 space-y-4">
          {searchResults.map((r) => {
            return (
              <ButtonAsset
                assetImgPath={assets[r[2]].assetImgPath}
                assetHash={assets[r[2]].assetHash}
                assetName={assets[r[2]].assetName}
                assetTicker={assets[r[2]].assetTicker}
                quantity={assets[r[2]].quantity}
                key={`${r[1]}_${r[2]}`}
                onClick={handleSend}
              />
            );
          })}
        </div>
      </div>
    </ShellPopUp>
  );
};

export default SelectAsset;
