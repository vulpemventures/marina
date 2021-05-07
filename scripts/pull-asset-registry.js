const fs = require('fs');
const axios = require('axios');

async function main() {
  try {
    const res = await axios.get('https://assets.blockstream.info/');

    // Light Nite assets
    const assetHashes = Object.values(res.data)
      .filter(asset => asset.entity.domain.includes("lightnite.io"))
      .map(asset => asset.asset_id);

    const path = './src/application/constants/lightnite_asset_hash.json';
    fs.writeFileSync(path, JSON.stringify(assetHashes, undefined, 0));
    console.log('JSON written to ' + path);

  } catch (e) {
    console.error(e)
  }
}

main()