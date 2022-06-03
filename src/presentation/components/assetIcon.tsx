import React from 'react';
import { getAssetImagePath } from '../../application/utils/constants';

const UNKNOWN_ASSET_ICON = 'assets/images/liquid-assets/unknown.png';

interface ImgProps {
  className?: string;
  onClick?: () => void;
  onError?: (event: any) => void;
}

const AssetImg: React.FC<{ path: string } & ImgProps> = ({ path, className, onClick, onError }) => {
  return (
    <img className={className} src={path} alt="asset logo" onError={onError} onClick={onClick} />
  );
};

const AssetIcon: React.FC<{ assetHash: string } & ImgProps> = ({ assetHash, className }) => {
  const [err, setError] = React.useState(false);

  if (err) {
    return <AssetImg path={UNKNOWN_ASSET_ICON} className={className} />;
  }

  return (
    <AssetImg
      path={getAssetImagePath(assetHash)}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default React.memo(AssetIcon);
