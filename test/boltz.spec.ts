import type { MakeClaimTransactionParams, MakeRefundTransactionParams } from '../src/pkg/boltz';
import { Boltz, boltzUrl } from '../src/pkg/boltz';
import type { OwnedInput } from 'liquidjs-lib';
import {
  Creator,
  Transaction,
  Updater,
  crypto,
  networks,
  payments,
  script,
  ZKPValidator,
  AssetHash,
  Blinder,
  Pset,
  ZKPGenerator,
} from 'liquidjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import type { RefundableSwapParams } from '../src/domain/repository';
import { initWalletRepository } from '../src/domain/repository';
import { swapEndian } from '../src/application/utils';
import { faucet, getBlockTip, sleep } from './_regtest';
import type { Account } from '../src/application/account';
import { AccountFactory, MainAccountTest } from '../src/application/account';
import { WalletStorageAPI } from '../src/infrastructure/storage/wallet-repository';
import { generateMnemonic } from 'bip39';
import {
  BlockstreamExplorerURLs,
  NigiriDefaultExplorerURLs,
  BlockstreamTestnetExplorerURLs,
} from '../src/domain/explorer';
import { AppStorageAPI } from '../src/infrastructure/storage/app-repository';
import { SignerService } from '../src/application/signer';
import zkp from '@vulpemventures/secp256k1-zkp';
import { toBlindingData } from 'liquidjs-lib/src/psbt';
import type { Payment } from 'liquidjs-lib/src/payments';
import type { ChainSource, Unspent } from '../src/domain/chainsource';

const PASSWORD = 'PASSWORD';

const appRepository = new AppStorageAPI();
const walletRepository = new WalletStorageAPI();
let factory: AccountFactory;
let zkpLib: any;

const blindPset = (pset: Pset, ownedInput: OwnedInput): Pset => {
  const { ecc } = zkpLib;
  const zkpValidator = new ZKPValidator(zkpLib);
  const zkpGenerator = new ZKPGenerator(zkpLib, ZKPGenerator.WithOwnedInputs([ownedInput]));
  const outputBlindingArgs = zkpGenerator.blindOutputs(pset, Pset.ECCKeysGenerator(ecc));
  const blinder = new Blinder(pset, [ownedInput], zkpValidator, zkpGenerator);
  blinder.blindLast({ outputBlindingArgs });
  return blinder.pset;
};

const getAddressForSwapScript = (
  refundPubKey = '03853d78bd2e188d3abb21f6e02ff38d899b79b020bdb6709b358421f0b8dada99',
  timelockBlockHeight = 1197064
): Payment => {
  const blindkey = Buffer.from(
    '026477115981fe981a6918a6297d9803c4dc04f328f22041bedff886bbc2962e01',
    'hex'
  );
  const timelock = swapEndian(timelockBlockHeight.toString(16));
  const preimageHash = 'a10c47b65595b8d960e6d292ddcb85d647e62fda';
  const boltzPubkey = '03c952bf8e7cc0ceda01164c216575aef72a5ccc7a7d29a0f16feab60890e933e8';
  const swapASM = [
    'OP_HASH160',
    preimageHash,
    'OP_EQUAL',
    'OP_IF',
    boltzPubkey,
    'OP_ELSE',
    timelock,
    'OP_NOP2',
    'OP_DROP',
    refundPubKey,
    'OP_ENDIF',
    'OP_CHECKSIG',
  ].join(' ');
  const network = networks['regtest'];
  const scriptBuf = script.fromASM(swapASM);
  const scriptHash = crypto.sha256(scriptBuf);
  const output = script.fromASM(`OP_0 ${scriptHash.toString('hex')}`);
  const { address } = payments.p2wsh({ output, network });
  return payments.p2wsh({ address, blindkey, network });
};

const getAccount = async (): Promise<Account> => {
  return await factory.make('regtest', MainAccountTest);
};

const getNextAddress = async (account: Account) => {
  const nextAddress = await account.getNextAddress(false);
  expect(nextAddress).toBeDefined();
  expect(nextAddress.publicKey).toBeDefined();
  expect(nextAddress.confidentialAddress).toBeDefined();
  return nextAddress;
};

const getChainSource = async (): Promise<ChainSource> => {
  const chainSource = await appRepository.getChainSource('regtest');
  if (!chainSource) throw new Error('undefined chainsource');
  return chainSource;
};

const getUnblindedUtxo = async (nextAddress: any): Promise<Unspent> => {
  const chainSource = await getChainSource();
  const [utxo] = await chainSource.listUnspents(nextAddress.confidentialAddress);
  const { asset, assetBlindingFactor, value, valueBlindingFactor } = await toBlindingData(
    Buffer.from(nextAddress.blindingPrivateKey!, 'hex'),
    utxo.witnessUtxo
  );
  utxo['blindingData'] = {
    asset: asset.reverse().toString('hex'),
    assetBlindingFactor: assetBlindingFactor.toString('hex'),
    value: parseInt(value, 10),
    valueBlindingFactor: valueBlindingFactor.toString('hex'),
  };
  return utxo;
};

const broadcastSwapTx = async (): Promise<string> => {
  const account = await getAccount();
  const chainSource = await getChainSource();
  const nextAddress = await getNextAddress(account);

  // faucet 1 BTC
  await faucet(nextAddress.confidentialAddress, 1);
  await sleep(5000);

  // const blockTip = await getBlockTip();
  const swapAddress = getAddressForSwapScript(nextAddress.publicKey);

  const utxo = await getUnblindedUtxo(nextAddress);
  if (!utxo.blindingData) throw new Error('missing blinding data');

  const pset = Creator.newPset();
  const updater = new Updater(pset);

  updater
    .addInputs([
      {
        txid: utxo.txid,
        txIndex: utxo.vout,
        witnessUtxo: utxo.witnessUtxo,
        sighashType: Transaction.SIGHASH_ALL,
      },
    ])
    .addOutputs([
      {
        amount: utxo.blindingData.value - 1500,
        asset: networks.regtest.assetHash,
        script: swapAddress.output,
        blinderIndex: 0,
        blindingPublicKey: swapAddress.blindkey,
      },
      {
        amount: 1500,
        asset: networks.regtest.assetHash,
      },
    ]);

  const blindedPset = blindPset(pset, {
    index: 0,
    value: utxo.blindingData.value.toString(),
    valueBlindingFactor: Buffer.from(utxo.blindingData.valueBlindingFactor, 'hex'),
    asset: AssetHash.fromHex(utxo.blindingData.asset).bytesWithoutPrefix,
    assetBlindingFactor: Buffer.from(utxo.blindingData.assetBlindingFactor, 'hex'),
  });

  const signer = await SignerService.fromPassword(walletRepository, appRepository, PASSWORD);
  const signedPset = await signer.signPset(blindedPset);
  const hex = signer.finalizeAndExtract(signedPset);
  expect(hex).toBeTruthy();

  const txid = chainSource.broadcastTransaction(hex);
  expect(txid).toBeDefined();
  return txid;
};

describe('Boltz Atomic Swap', () => {
  beforeAll(async () => {
    zkpLib = await zkp();
    const mnemonic = generateMnemonic();
    // set up a random wallet in repository
    // also set up default main Marina accounts
    await initWalletRepository(walletRepository, mnemonic, PASSWORD);
    await appRepository.setNetwork('regtest'); // switch to regtest
    await appRepository.setWebsocketExplorerURLs({
      liquid: BlockstreamExplorerURLs.websocketExplorerURL,
      regtest: NigiriDefaultExplorerURLs.websocketExplorerURL,
      testnet: BlockstreamTestnetExplorerURLs.websocketExplorerURL,
    });
    factory = await AccountFactory.create(walletRepository);
  });
  it('should construct a claim transaction', async () => {
    const zkpLib = await require('@vulpemventures/secp256k1-zkp')();
    const boltz = new Boltz(boltzUrl['testnet'], networks['testnet'].assetHash, zkpLib);
    const claimPrivateKey = Buffer.from(
      '8acb390265b2edd2f87ce295e957d4ea8c13089a9aced0890351d03cffb7d272',
      'hex'
    );
    const claimKeyPair = ECPairFactory(ecc).fromPrivateKey(claimPrivateKey);
    const params: MakeClaimTransactionParams = {
      utxo: {
        txid: '61e67fc411ca1b9dd83f88e181e74d41ce767acb0b6eaa5753647bab88ff6843',
        vout: 1,
        blindingData: {
          asset: '144c654344aa716d6f3abcc1ca90e5641e4e2a7f633bc09fe3baf64585819a49',
          assetBlindingFactor: 'c3781e6f8e0a278ee4e5c7176651ccfdfd1b0f65f2b53b125a3d4764afc199cb',
          value: 9684,
          valueBlindingFactor: '5a8fae26d9bae1e75eda5940f205ffa9b6f76d5d745496af7998dbfd110eecfe',
        },
        witnessUtxo: {
          asset: Buffer.from(
            '0b7eb26605ebea121475f6a379b47ae4038e6c21b92ba06179a772117d1b8a9940',
            'hex'
          ),
          nonce: Buffer.from(
            '036b8e58206032ec64c2b9836c248aae77bf1a35045d5803420d0436f5491ef71d',
            'hex'
          ),
          value: Buffer.from(
            '09a40527352b8a8ddc724cc33cd0775a3aff6a6609de89480342425194a6787ba7',
            'hex'
          ),
          script: Buffer.from(
            '002086d573921a546b2c84bc96fc6c859ea396fe186d0b18ec21c9aec2caa622d02c',
            'hex'
          ),
          rangeProof: Buffer.from(
            '6033000000000000000124e897008a37e4456ed5068ed193bb1faf269a18238885c58b7d9102efd698f1aa5e4eef5a89d892fb04dde4230799afa6f354006d3977280a9fbf10832fdc7c3bbdd20b05264fca52a1ead3c1a97a5c06a7a1bf274763e32fce9a16d34f4eda76c160b1e8fce26da6c7f99c2d68dd8790e58fe8ec6dbb290dd55633fa2f0053f201b43008a960b1ebac433f59486bc28b06c2fdf959344702f5cf8b627adf49d364036bf9e0cc2610e036c041b7d97d2ffe95f38f43283695343242f9e2d1203d3327fc1502620fd00c03e184e65f4c0425841f2e1c0e24e9823fb38eabe27dcb770621040a69162cf892392964638c6c8a7a54d23953c9496979b0260daf6277e7bee76dd1554a43043b8d6c6fc7d8d09e550c56b7d31cf8ff4c207ac8a97723057e0603a72332ee4a65e817bcf8a72ef84d251a014e1130fbce0e7dbf32a040849e57bc964110dac6b99ffda10c9e59367fe9ff1737dcceb99377416c86369f25ac606a214ea0e7e73291c8c6a692a7b5615822cbff22a2de3ffb18f93741cd2f6be38249a9d8701660d4f9d6ec9d66ca2684be1f6c4c6020bf9dafe32db11ce19b6157cc4bb0743294ba33d5d75c8d853d6d2716dfafc3e47c684c51c651d6a673107d88b303624e4f20359cc61724aa40dca42a992afe102f3bc03f387ba6204720804fe4c0e7f6f0fa39b5f3bf0591d9c89a1ad1d61bf5f46b47bcaa0a36a2ac700265864611ce76d5e84874abf8e758b4757901fa84ea28e601ea902d7d9fd19742cac75875602fdb2c60017e2e835364aad50ccea0c2d8227ef9a656585a1ef26034f9df9ae0cb7557a6b0ac85ebbcea497c7d39eeaecacdc9f3245348de4015649a6c1de3246e2cb241d7c199c0c76a1cd62c20bcc4f954a70ddabb0301e94d73be3dd931b7db1180b7a824aee15edd37a977f169dfe74c2d2d43801f9dda7bb9dd2c4a53d766c2c62b4abfbeb78da0ce5ff4c519a2038c6dae440f06b1c71d1ebb9c1af0ae0df8ff46b76d15d216e24fd5a043ce2dab0b9888f902fe797679fa09aa93855003c9e15a2e01c3fdb1ccd843daefc8fd3366dc2ca6879d11fb229aee330c26ee62359fedb4a7e400005d902a669aa37f2b85b9c65fc8ca5aed3153cdb517782f2d22b682bbf48cd0a7ba8c4827bde6b392853d376925ac01559e193206fb2ea06e9b9eb662e8e2a2c1ea246bab5a2c4fc9789f678108d9cb32b3e297b31200907f841773e8d9f8c0d56ce8cf000239da55df91d3b1ae9b4af23a3f1f229c91831500c1737e68033c39f27d623246af7029d9dcd2fd6b4d98a498e47243ef6e1a35806112f47cb56f1480e07589ae8b00b0e43e70c6c0d7edb8bfc39ec0e535c5c880b63fbcc9a3ac3182bc26911e9fed9916aec78f0b289b89960dae365abd7ea69ed662fc3279e028155950a7f71139a06950cb5065ae65a977f728baeffa3a94c437ed92126deba0ef7d1bb12d8e792d05eb5bd2429e4075e62e04f551723c383a8a7e5564882126c5439704bec69e3854ddf463b5cfcf7660079dd7aef94449dd461a023795b53bda274cf53a1416f6c99a5b585d8a2da27a0e4ecb830ded0e16016cafd33f48014bd037befa86fd7e40ad1f2019e28c29bb7148c1a5ad7b9ef9d8f1972e060527d4fffb6dc63d7eeeed2be86afbfc8ae7d875aeff5c54bd75da90ca88bc39f57ddd6679349472b148e47b161894da5d5e52594d58e2585443dcb7ea248fe7d767a1b0174ebbc382db214e08cd41eeee865e368480be60321a52f6284f8b88793cb754ab51e436cb3742e99c2540d76d443aa927ebe67772240eee13aa9bd65b7662673965c191960b4177d23dbf7a0b98ee7e0b83ae07d04a48c086919189741696d2c2fed5a588f9e260695f3e450e1e73b0ab4aa3f5367160464f933a48111bde9a0df1da2d892ed0cd6e32a1845725d1605607c6603183092a3805ac904007b16b5457471971a97d739ccf4982badbf653e2f0eed56bdeef8e4ae03b938aeb341db1aab331a844e480df9cd24b5f5ffe88f983fb1a0c5e5b57b5024961a354c9fbe30a598b62195e42d194100b8b352c84db331bde7eaf70b605e339098cd90a715a725769b7dcaaeed015d07897db2b067f9fdb86de1d0c423338762e57b95426a312269f188f1c0687b2f5939e3694d963df80a70d1ace3da78c6c27993d35d17d1ae354a39005512da1dda64fbb44fc04064b43c77a29a34090c8c882e38599b9372fa7cf30d1bf46f4e5cbe914725f06cb37b28b0636e2eb51371508c57dc9e93386dad5a2ea6583cfc0268c6dabac757c6c43d2d8e8e49588ad5ad996b8d5bbe15fdd58a9cc0a3341b916fcb1277bfe94b5a3dd6c82fc073b5ab3dc6e3806cba6196bad56abf0db4986e3451caa9ecb92436e47ccdf670d23c031f5f836e34ca9252ecfed3af7d977b0398750ad5ab83c6cc67f9c8cf1a8ed0295996a9907835caaf4a84c9749b3d0d85824b897e6eea3c3419878ebc70d9c3f173bbe5042f5595e053b16091302f30cc3ec93625821d75cdc7bc682b7b713bf643ecf6c7d8f6a7836983faf338366ad99c680921c69c22fe7f6576c794e0062dda06d3a0fbcf5cf841edcb46d50403bb315ba77f5288a546efe78171c6e7c19871211a7faf172070874831c5c3ae3220d28ffd5e11efcadb47f12cd525ef03d0f58ce40f2dd50b0eb75e3ff4bdee14d953d58da898b25ee41fe629705c6f66bc7af33dca5aa567633187e2889635e78f7178787ec0890b748dd8743a32586f194ecee8c582a0c1f07d8f3de7b507f0120a0b7c81d923d308c25ebf4f63dfaea3b058cae0af7009fa7cbc81b9ac0478b1388f880932f017080defe9b551d28cc3e3bbffdf9d9aba7e737d48e69a7be3cfe9a173daa47be20a0d09f5d88f5b28feebffc7cac03cbf5653f69b48a0f0b9b340f7a7790c2ba89b060b9d44a6cbb3861cd601ef2b197ad06db8aa3ab090feaf970014ce966762263215bfcaa40b22cc7a2b636884555624891a328efbd746589db73154a3f8fbf59a6acaa1e0e67bda0d51af8b9b1c40c9df5df73d46392b1afc04346fc106295386cf0f3ede539fe9669056e67be55b8db9ed8f5fdbd0be248266c47fbd53f6364b8026025c2a464e863d93911c580887c5968f126a457710e4053fb24cbf3bcf4aa669415f8d864b9d284a3908b6f728e93fc0fe28bffc4fc0596e144cf1a94e02d5a1874531746c6288fcc8e0de534122cb4239ed8002e18ec1c4b022a56a3ac7a6a3c5c1aa3053e1dc1151525f75b4967e6a3e8fb6a519783a4812b99b4969af49a24cf41cea59e9bcd8b2065168873c6ef6313877aad8598c106539ac667474785ec98ef50fad7a24056a54bc821a58a8546145a4877ef2a01f7023a2b4403a1a23191000705d4e9f4439559268efb43f38db751d5c4aa221b07396ef0c5e5356d48ff893c06ac3bfa299d9a2944ab18a0549228a7a5aba10b3a5269003a4927c36e03f81be620eb6980b48b8293b55c8f6b53d991b84bdbc2d0de5c597d4f3caa17f54218063ab0b3affbf7bf8127898cb452f5da77b7e21932a37a743aca560e41f3965af202bd756403c235c2e3dfc2b0f34b53901c93045bf348c18d20bb190f4154adddc24ca2da51d52188fee4c2267014f09b1ee2493678e58d9c5a0d3868423c6b151b9b3851c483cc83d1ab436c5ce50d07147d586577dfeb533e5d41abf4044ae0d774704b3121c6530b5be8e4bdd82ce5b84d01ad317f85f09b2038ea13f207fc47e79ff8d83319b587e8309622ce614f350c5a1a017979efc2064c93dcc0f5a76d7e51d02eafcb47462dca3ce3140cb2c4379d71b4ee94a5996d4b5413d54cddf1a611944a0d1eccd8ec7d1e4da93ebb950e8b2bb417a56191c3b640bb692170f95e3af16dfbb8b900820955d7510470f9c1b8032445ab7eea13d61a8833c22ce323b0d2e629792c88c4d1f44e01ffa47b07d512c768f27e924bd120e7322d20fb0c2f86c67689e50b87096dbe698727e938a99b6d29c123d389f1ebeafddbe1bd1759128a368438b18c50b024e997409fd14d5974a50dbfc57e189e9d517fde463ece2d5146cfb7648bb5b36169ef83424009fe22ecc7f9904cea9d49562b796e0ba4470d3d45ba242dc2772fc9394e7abc077d2191c81d1ffb5c6d646e261a9587b130d771a0e252890e00d0ef8b129073d21115a5b75bc5a29c1b3285a640c65c8c5655bd7e4b1c315cf4b7234ad488a0b30aee0b97cb1680931eaa6cb8669cfceb591423721cf05b39e7a563b63fd69f51d5c33fac521810f1e0a36581fd87d0938c4b53555237c0f64dbfb5697ff87c08278443989a08b6205d1509736efa270cea08be6c204bab95924eec449f053119a09631396139375d578aa331fcb6274eb30e903111c8ebed120c9c454a378bf4ecb222608055a386ee8d82efddf4bc89c761bc83be3105768f681c69e375023a33f9c4c6d769a07feaf2a700262bc824080edd9152269662c3ee422bf063b5c9eaccba49a2248fe969a1a58c17ee9f7dd4a382888c384598fe282c5c68dcaaf875210e235709ca9c62b0c12b5d08734d8d819e2b907309b0a59c59e5044b305496f11c1cfc347a82451af7db76d06ead4218e2d25d85d5bb24b0c4fadf7bd09d53e277a4adf9b050dd46cbf6431a132483138e3397c1840e0c05d1516f80e0ded23e63de345d4d04b52171b342d68e410e87709221540e6300a32a6260f50a8c06249360c9921330c97c82f040c05b049066d546d033a6b52c13aa0e7bb2a02f32bb990a526a63e3e757ffea8cc688632a96d54e8cf23b2153b9d3f4fd8241ea7430b50d0092b30cbdfc49819c3c8b63a67bb25d38614286053487dca654695010248e02e9a3e67bf9e9f60e3ccf69e1a1613a75b79778a01e85a4685aa2ee9771131de9426028720387a91b7e811f396754f97b7994857ff81e0c1c1bd378dee2c159ae92c9aeacccaa107bf00216424ec9ba2c044479f41f909de862d17a939bdd1e79da1864c14e2ec86f3035b651bea7e69ef84ba9bde7921fe00bc00f28a0c48ebdcbf1600743e20beca7f016c9f7bfddcc47b4745576272cfe38fb6f2ab22cddcfb6e34d1c566b3c97d694a2678c5681a31ad7bb752ca0ec89f4d5a6b5b298da6c3dc22a8fc5edbb07fcdae460ceecfa7a7027b19b718355922d2d0aaab3dfe6689d36e9d163506ca9f208602b2fb15d5ef936fad8a465298fde7bcd6dfb101564638a8e28a959b10aed80e0045300b07d478bcb62ce8160249c154ce994a324df71fd4549ef5db598bcf867c96f95bcdd0facaf4322eba67dbacdb39385080cdcacc50f1b253505e40915dd088544f9b3b0c32d4875b8ff6c9714c1cbed0ca2f6df10db2cb250d2206c823ae71d5c403248214f6f5ad3d4c1dd65e20c23b0dfef49ad2eee9bfef12ce4b21da8b02742ea58b160439b9f2d10b4f843219fdac3e2ad8057d1bf6ccc18cf7201cc9bf787ce6ffc973015d14a7f7695ef371e038e9533754cf739e1520f152b24b0e794bf2968677918e0e965fc9afa5f8b0664778e3dc8a89e66081ae789c4e1453072e55ca02077e083108b0a4282c7a44db2be5270f37e9f8140504850a07471cdbe98abb58838faadefead6c4ceab6723457a6dfc4ce8ffd47b064b6e4ac61e2b66268df1f100a21422a2878bb91bea5ff623db7de0b6bb92c3cd420d8123953939d1139f0afab342482325e1ac84538483adc1246e9828b9c6b5f1f36970f345fc17c831fb7a35e29cdeeed19f0b50180cd5908fc2157dab1581fe15480bce270eca15002b4054614d15fcbd3474c18e5958b661b6e6058d8f47d9510892c65b75a480b1fcbde5b491e712bc2553b770',
            'hex'
          ),
          surjectionProof: Buffer.from(
            '020003473cdd5d70a2f0e338167419fe32bef6a10ade697af0d707366e03764a1de2cab1a7824314a8863acaa5cb7dd597098806299d6ae5305a14db9a8dfc2d029556f8a3f1a1572096faae6cd1ebd0f2b0980fc7e8f6e4cabd2934b1a06cc8ce6107',
            'hex'
          ),
        },
      },
      claimKeyPair: claimKeyPair,
      preimage: Buffer.from(
        'bb8dd2e659291e9bcd5c43e7e75383805bfd3bd2caeed89f9df7e189b974d33a',
        'hex'
      ),
      redeemScript: Buffer.from(
        '8201208763a914161789b0309c019054d0c1daef45c1498f09d078882103cec40d2706799e7329cc85f7eb1e9f1b886ff78bc4d6f49c2c21fb0589d93f5767750309f011b1752102fca2eb11f593c1736e8f93fb59a2456a6ad46eed17085af472f8b8eea2be81d068ac',
        'hex'
      ),
      destinationScript: Buffer.from('0014352e2b02775fe9e71890e379ce84191f2bf2081a', 'hex'),
      blindingPublicKey: Buffer.from(
        '030bec8e57ac22abb4e2b717847346c3ce7b83969c256f9fadd5f9b6ab08f37850',
        'hex'
      ),
    };
    const claimTx = boltz.makeClaimTransaction(params);
    expect(claimTx).toBeDefined();
  });
  it('should create a refund transaction', async () => {
    const zkpLib = await require('@vulpemventures/secp256k1-zkp')();
    const boltz = new Boltz(boltzUrl['testnet'], networks['testnet'].assetHash, zkpLib);
    const refundPrivateKey = Buffer.from(
      '8acb390265b2edd2f87ce295e957d4ea8c13089a9aced0890351d03cffb7d272',
      'hex'
    );
    const refundKeyPair = ECPairFactory(ecc).fromPrivateKey(refundPrivateKey);
    const params: MakeRefundTransactionParams = {
      utxo: {
        txid: '61e67fc411ca1b9dd83f88e181e74d41ce767acb0b6eaa5753647bab88ff6843',
        vout: 1,
        blindingData: {
          asset: '144c654344aa716d6f3abcc1ca90e5641e4e2a7f633bc09fe3baf64585819a49',
          assetBlindingFactor: 'c3781e6f8e0a278ee4e5c7176651ccfdfd1b0f65f2b53b125a3d4764afc199cb',
          value: 9684,
          valueBlindingFactor: '5a8fae26d9bae1e75eda5940f205ffa9b6f76d5d745496af7998dbfd110eecfe',
        },
        witnessUtxo: {
          asset: Buffer.from(
            '0b7eb26605ebea121475f6a379b47ae4038e6c21b92ba06179a772117d1b8a9940',
            'hex'
          ),
          nonce: Buffer.from(
            '036b8e58206032ec64c2b9836c248aae77bf1a35045d5803420d0436f5491ef71d',
            'hex'
          ),
          value: Buffer.from(
            '09a40527352b8a8ddc724cc33cd0775a3aff6a6609de89480342425194a6787ba7',
            'hex'
          ),
          script: Buffer.from(
            '002086d573921a546b2c84bc96fc6c859ea396fe186d0b18ec21c9aec2caa622d02c',
            'hex'
          ),
          rangeProof: Buffer.from(
            '6033000000000000000124e897008a37e4456ed5068ed193bb1faf269a18238885c58b7d9102efd698f1aa5e4eef5a89d892fb04dde4230799afa6f354006d3977280a9fbf10832fdc7c3bbdd20b05264fca52a1ead3c1a97a5c06a7a1bf274763e32fce9a16d34f4eda76c160b1e8fce26da6c7f99c2d68dd8790e58fe8ec6dbb290dd55633fa2f0053f201b43008a960b1ebac433f59486bc28b06c2fdf959344702f5cf8b627adf49d364036bf9e0cc2610e036c041b7d97d2ffe95f38f43283695343242f9e2d1203d3327fc1502620fd00c03e184e65f4c0425841f2e1c0e24e9823fb38eabe27dcb770621040a69162cf892392964638c6c8a7a54d23953c9496979b0260daf6277e7bee76dd1554a43043b8d6c6fc7d8d09e550c56b7d31cf8ff4c207ac8a97723057e0603a72332ee4a65e817bcf8a72ef84d251a014e1130fbce0e7dbf32a040849e57bc964110dac6b99ffda10c9e59367fe9ff1737dcceb99377416c86369f25ac606a214ea0e7e73291c8c6a692a7b5615822cbff22a2de3ffb18f93741cd2f6be38249a9d8701660d4f9d6ec9d66ca2684be1f6c4c6020bf9dafe32db11ce19b6157cc4bb0743294ba33d5d75c8d853d6d2716dfafc3e47c684c51c651d6a673107d88b303624e4f20359cc61724aa40dca42a992afe102f3bc03f387ba6204720804fe4c0e7f6f0fa39b5f3bf0591d9c89a1ad1d61bf5f46b47bcaa0a36a2ac700265864611ce76d5e84874abf8e758b4757901fa84ea28e601ea902d7d9fd19742cac75875602fdb2c60017e2e835364aad50ccea0c2d8227ef9a656585a1ef26034f9df9ae0cb7557a6b0ac85ebbcea497c7d39eeaecacdc9f3245348de4015649a6c1de3246e2cb241d7c199c0c76a1cd62c20bcc4f954a70ddabb0301e94d73be3dd931b7db1180b7a824aee15edd37a977f169dfe74c2d2d43801f9dda7bb9dd2c4a53d766c2c62b4abfbeb78da0ce5ff4c519a2038c6dae440f06b1c71d1ebb9c1af0ae0df8ff46b76d15d216e24fd5a043ce2dab0b9888f902fe797679fa09aa93855003c9e15a2e01c3fdb1ccd843daefc8fd3366dc2ca6879d11fb229aee330c26ee62359fedb4a7e400005d902a669aa37f2b85b9c65fc8ca5aed3153cdb517782f2d22b682bbf48cd0a7ba8c4827bde6b392853d376925ac01559e193206fb2ea06e9b9eb662e8e2a2c1ea246bab5a2c4fc9789f678108d9cb32b3e297b31200907f841773e8d9f8c0d56ce8cf000239da55df91d3b1ae9b4af23a3f1f229c91831500c1737e68033c39f27d623246af7029d9dcd2fd6b4d98a498e47243ef6e1a35806112f47cb56f1480e07589ae8b00b0e43e70c6c0d7edb8bfc39ec0e535c5c880b63fbcc9a3ac3182bc26911e9fed9916aec78f0b289b89960dae365abd7ea69ed662fc3279e028155950a7f71139a06950cb5065ae65a977f728baeffa3a94c437ed92126deba0ef7d1bb12d8e792d05eb5bd2429e4075e62e04f551723c383a8a7e5564882126c5439704bec69e3854ddf463b5cfcf7660079dd7aef94449dd461a023795b53bda274cf53a1416f6c99a5b585d8a2da27a0e4ecb830ded0e16016cafd33f48014bd037befa86fd7e40ad1f2019e28c29bb7148c1a5ad7b9ef9d8f1972e060527d4fffb6dc63d7eeeed2be86afbfc8ae7d875aeff5c54bd75da90ca88bc39f57ddd6679349472b148e47b161894da5d5e52594d58e2585443dcb7ea248fe7d767a1b0174ebbc382db214e08cd41eeee865e368480be60321a52f6284f8b88793cb754ab51e436cb3742e99c2540d76d443aa927ebe67772240eee13aa9bd65b7662673965c191960b4177d23dbf7a0b98ee7e0b83ae07d04a48c086919189741696d2c2fed5a588f9e260695f3e450e1e73b0ab4aa3f5367160464f933a48111bde9a0df1da2d892ed0cd6e32a1845725d1605607c6603183092a3805ac904007b16b5457471971a97d739ccf4982badbf653e2f0eed56bdeef8e4ae03b938aeb341db1aab331a844e480df9cd24b5f5ffe88f983fb1a0c5e5b57b5024961a354c9fbe30a598b62195e42d194100b8b352c84db331bde7eaf70b605e339098cd90a715a725769b7dcaaeed015d07897db2b067f9fdb86de1d0c423338762e57b95426a312269f188f1c0687b2f5939e3694d963df80a70d1ace3da78c6c27993d35d17d1ae354a39005512da1dda64fbb44fc04064b43c77a29a34090c8c882e38599b9372fa7cf30d1bf46f4e5cbe914725f06cb37b28b0636e2eb51371508c57dc9e93386dad5a2ea6583cfc0268c6dabac757c6c43d2d8e8e49588ad5ad996b8d5bbe15fdd58a9cc0a3341b916fcb1277bfe94b5a3dd6c82fc073b5ab3dc6e3806cba6196bad56abf0db4986e3451caa9ecb92436e47ccdf670d23c031f5f836e34ca9252ecfed3af7d977b0398750ad5ab83c6cc67f9c8cf1a8ed0295996a9907835caaf4a84c9749b3d0d85824b897e6eea3c3419878ebc70d9c3f173bbe5042f5595e053b16091302f30cc3ec93625821d75cdc7bc682b7b713bf643ecf6c7d8f6a7836983faf338366ad99c680921c69c22fe7f6576c794e0062dda06d3a0fbcf5cf841edcb46d50403bb315ba77f5288a546efe78171c6e7c19871211a7faf172070874831c5c3ae3220d28ffd5e11efcadb47f12cd525ef03d0f58ce40f2dd50b0eb75e3ff4bdee14d953d58da898b25ee41fe629705c6f66bc7af33dca5aa567633187e2889635e78f7178787ec0890b748dd8743a32586f194ecee8c582a0c1f07d8f3de7b507f0120a0b7c81d923d308c25ebf4f63dfaea3b058cae0af7009fa7cbc81b9ac0478b1388f880932f017080defe9b551d28cc3e3bbffdf9d9aba7e737d48e69a7be3cfe9a173daa47be20a0d09f5d88f5b28feebffc7cac03cbf5653f69b48a0f0b9b340f7a7790c2ba89b060b9d44a6cbb3861cd601ef2b197ad06db8aa3ab090feaf970014ce966762263215bfcaa40b22cc7a2b636884555624891a328efbd746589db73154a3f8fbf59a6acaa1e0e67bda0d51af8b9b1c40c9df5df73d46392b1afc04346fc106295386cf0f3ede539fe9669056e67be55b8db9ed8f5fdbd0be248266c47fbd53f6364b8026025c2a464e863d93911c580887c5968f126a457710e4053fb24cbf3bcf4aa669415f8d864b9d284a3908b6f728e93fc0fe28bffc4fc0596e144cf1a94e02d5a1874531746c6288fcc8e0de534122cb4239ed8002e18ec1c4b022a56a3ac7a6a3c5c1aa3053e1dc1151525f75b4967e6a3e8fb6a519783a4812b99b4969af49a24cf41cea59e9bcd8b2065168873c6ef6313877aad8598c106539ac667474785ec98ef50fad7a24056a54bc821a58a8546145a4877ef2a01f7023a2b4403a1a23191000705d4e9f4439559268efb43f38db751d5c4aa221b07396ef0c5e5356d48ff893c06ac3bfa299d9a2944ab18a0549228a7a5aba10b3a5269003a4927c36e03f81be620eb6980b48b8293b55c8f6b53d991b84bdbc2d0de5c597d4f3caa17f54218063ab0b3affbf7bf8127898cb452f5da77b7e21932a37a743aca560e41f3965af202bd756403c235c2e3dfc2b0f34b53901c93045bf348c18d20bb190f4154adddc24ca2da51d52188fee4c2267014f09b1ee2493678e58d9c5a0d3868423c6b151b9b3851c483cc83d1ab436c5ce50d07147d586577dfeb533e5d41abf4044ae0d774704b3121c6530b5be8e4bdd82ce5b84d01ad317f85f09b2038ea13f207fc47e79ff8d83319b587e8309622ce614f350c5a1a017979efc2064c93dcc0f5a76d7e51d02eafcb47462dca3ce3140cb2c4379d71b4ee94a5996d4b5413d54cddf1a611944a0d1eccd8ec7d1e4da93ebb950e8b2bb417a56191c3b640bb692170f95e3af16dfbb8b900820955d7510470f9c1b8032445ab7eea13d61a8833c22ce323b0d2e629792c88c4d1f44e01ffa47b07d512c768f27e924bd120e7322d20fb0c2f86c67689e50b87096dbe698727e938a99b6d29c123d389f1ebeafddbe1bd1759128a368438b18c50b024e997409fd14d5974a50dbfc57e189e9d517fde463ece2d5146cfb7648bb5b36169ef83424009fe22ecc7f9904cea9d49562b796e0ba4470d3d45ba242dc2772fc9394e7abc077d2191c81d1ffb5c6d646e261a9587b130d771a0e252890e00d0ef8b129073d21115a5b75bc5a29c1b3285a640c65c8c5655bd7e4b1c315cf4b7234ad488a0b30aee0b97cb1680931eaa6cb8669cfceb591423721cf05b39e7a563b63fd69f51d5c33fac521810f1e0a36581fd87d0938c4b53555237c0f64dbfb5697ff87c08278443989a08b6205d1509736efa270cea08be6c204bab95924eec449f053119a09631396139375d578aa331fcb6274eb30e903111c8ebed120c9c454a378bf4ecb222608055a386ee8d82efddf4bc89c761bc83be3105768f681c69e375023a33f9c4c6d769a07feaf2a700262bc824080edd9152269662c3ee422bf063b5c9eaccba49a2248fe969a1a58c17ee9f7dd4a382888c384598fe282c5c68dcaaf875210e235709ca9c62b0c12b5d08734d8d819e2b907309b0a59c59e5044b305496f11c1cfc347a82451af7db76d06ead4218e2d25d85d5bb24b0c4fadf7bd09d53e277a4adf9b050dd46cbf6431a132483138e3397c1840e0c05d1516f80e0ded23e63de345d4d04b52171b342d68e410e87709221540e6300a32a6260f50a8c06249360c9921330c97c82f040c05b049066d546d033a6b52c13aa0e7bb2a02f32bb990a526a63e3e757ffea8cc688632a96d54e8cf23b2153b9d3f4fd8241ea7430b50d0092b30cbdfc49819c3c8b63a67bb25d38614286053487dca654695010248e02e9a3e67bf9e9f60e3ccf69e1a1613a75b79778a01e85a4685aa2ee9771131de9426028720387a91b7e811f396754f97b7994857ff81e0c1c1bd378dee2c159ae92c9aeacccaa107bf00216424ec9ba2c044479f41f909de862d17a939bdd1e79da1864c14e2ec86f3035b651bea7e69ef84ba9bde7921fe00bc00f28a0c48ebdcbf1600743e20beca7f016c9f7bfddcc47b4745576272cfe38fb6f2ab22cddcfb6e34d1c566b3c97d694a2678c5681a31ad7bb752ca0ec89f4d5a6b5b298da6c3dc22a8fc5edbb07fcdae460ceecfa7a7027b19b718355922d2d0aaab3dfe6689d36e9d163506ca9f208602b2fb15d5ef936fad8a465298fde7bcd6dfb101564638a8e28a959b10aed80e0045300b07d478bcb62ce8160249c154ce994a324df71fd4549ef5db598bcf867c96f95bcdd0facaf4322eba67dbacdb39385080cdcacc50f1b253505e40915dd088544f9b3b0c32d4875b8ff6c9714c1cbed0ca2f6df10db2cb250d2206c823ae71d5c403248214f6f5ad3d4c1dd65e20c23b0dfef49ad2eee9bfef12ce4b21da8b02742ea58b160439b9f2d10b4f843219fdac3e2ad8057d1bf6ccc18cf7201cc9bf787ce6ffc973015d14a7f7695ef371e038e9533754cf739e1520f152b24b0e794bf2968677918e0e965fc9afa5f8b0664778e3dc8a89e66081ae789c4e1453072e55ca02077e083108b0a4282c7a44db2be5270f37e9f8140504850a07471cdbe98abb58838faadefead6c4ceab6723457a6dfc4ce8ffd47b064b6e4ac61e2b66268df1f100a21422a2878bb91bea5ff623db7de0b6bb92c3cd420d8123953939d1139f0afab342482325e1ac84538483adc1246e9828b9c6b5f1f36970f345fc17c831fb7a35e29cdeeed19f0b50180cd5908fc2157dab1581fe15480bce270eca15002b4054614d15fcbd3474c18e5958b661b6e6058d8f47d9510892c65b75a480b1fcbde5b491e712bc2553b770',
            'hex'
          ),
          surjectionProof: Buffer.from(
            '020003473cdd5d70a2f0e338167419fe32bef6a10ade697af0d707366e03764a1de2cab1a7824314a8863acaa5cb7dd597098806299d6ae5305a14db9a8dfc2d029556f8a3f1a1572096faae6cd1ebd0f2b0980fc7e8f6e4cabd2934b1a06cc8ce6107',
            'hex'
          ),
        },
      },
      refundKeyPair: refundKeyPair,
      redeemScript: Buffer.from(
        '8201208763a914161789b0309c019054d0c1daef45c1498f09d078882103cec40d2706799e7329cc85f7eb1e9f1b886ff78bc4d6f49c2c21fb0589d93f5767750309f011b1752102fca2eb11f593c1736e8f93fb59a2456a6ad46eed17085af472f8b8eea2be81d068ac',
        'hex'
      ),
      destinationScript: Buffer.from('0014352e2b02775fe9e71890e379ce84191f2bf2081a', 'hex'),
      blindingPublicKey: Buffer.from(
        '030bec8e57ac22abb4e2b717847346c3ce7b83969c256f9fadd5f9b6ab08f37850',
        'hex'
      ),
      timeoutBlockHeight: 11,
    };

    // Call the makeRefundTransaction method
    const refundTransaction: Transaction = boltz.makeRefundTransaction(params);

    // Assert that the refund transaction is created successfully
    expect(refundTransaction).toBeDefined();
    // Add more assertions here if needed
  });
  it('should extract correct information from redeem script', async () => {
    const zkpLib = await require('@vulpemventures/secp256k1-zkp')();
    const boltz = new Boltz(boltzUrl['testnet'], networks['testnet'].assetHash, zkpLib);
    const params: RefundableSwapParams = {
      blindingKey: 'b7a2f354fa12f31b3705443fb0c52374dc56768fdd407e70d525008ce0b6f4e2',
      network: 'testnet',
      redeemScript:
        'a914a10c47b65595b8d960e6d292ddcb85d647e62fda87632103c952bf8e7cc0ceda01164c216575aef72a5ccc7a7d29a0f16feab60890e933e86703084412b1752103853d78bd2e188d3abb21f6e02ff38d899b79b020bdb6709b358421f0b8dada9968ac',
    };
    const info = boltz.extractInfoFromRefundableSwapParams(params);
    expect(info.fundingAddress).toEqual(
      'tex1q39gha6fdwu3pfw647cg6yq3eergjd02pnm7x30xgufq8kdnh0s4snsr7zh'
    );
    expect(info.timeoutBlockHeight).toEqual(1197064);
  });
  it('should generate a valid address from a swap script', () => {
    const address = getAddressForSwapScript().address;
    expect(address).toEqual('ert1q39gha6fdwu3pfw647cg6yq3eergjd02pnm7x30xgufq8kdnh0s4s9ywm40');
  });
  it('should broadcast a submarine swap transaction', async () => {
    const txid = await broadcastSwapTx();
    expect(txid).toBeDefined();
  }, 10_000);
});
