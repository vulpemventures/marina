const fs = require('fs');
const axios = require('axios');

const BASE_PATH = './src/application/constants';

async function main() {
  try {
    const res = await axios.get('https://assets.blockstream.info/');

    // Light Nite assets
    const lightNiteAssetHashes = Object.values(res.data)
      .filter(asset => asset.entity.domain.includes("lightnite.io"))
      .map(asset => asset.asset_id);

    const lightNitePath = `${BASE_PATH}/lightnite_asset_hash.json`;
    writeToFile(lightNitePath, lightNiteAssetHashes);

    // Blockstream
    const blockstreamAssetHashes = Object.values(res.data)
      .filter(asset => asset.entity.domain.includes("blockstream.com"))
      .map(asset => asset.asset_id);

    const blockstreamPath = `${BASE_PATH}/blockstream_asset_hash.json`;
    writeToFile(blockstreamPath, blockstreamAssetHashes);


  } catch (e) {
    console.error(e)
  }
}

function writeToFile(path, assets) {
  fs.writeFileSync(path, JSON.stringify(assets, undefined, 2));
  console.log('JSON written to ' + path);
}

main()