import { faucet, fetchUtxos, mint } from './_regtest';
import { deriveNewAddress, setUtxos } from '../src/application/store/actions';
import { xpubWalletFromAddresses } from '../src/application/utils';
import { Thunk, IAppState, Action } from '../src/domain/common';
import { Address } from '../src/domain/wallet/value-objects';

export function createDevState(
  onSuccess?: () => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState) => {
    const { wallets } = getState();
    const firstWallet = wallets[0];
    //
    if (firstWallet.utxoMap.size === 4) {
      onSuccess?.();
      return;
    }
    //
    const deriveNewAddressAction = function (): Promise<string> {
      return new Promise((resolve, reject) => {
        dispatch(
          deriveNewAddress(
            false,
            (address) => {
              resolve(address.value);
            },
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    try {
      //
      const confidentialAddr1 = await deriveNewAddressAction();
      const confidentialAddr2 = await deriveNewAddressAction();
      //
      const utxosAddr1 = await fetchUtxos(confidentialAddr1);
      const utxosAddr2 = await fetchUtxos(confidentialAddr2);
      //
      if (utxosAddr1.length < 3) {
        console.log(`Send 21 BTC to ${confidentialAddr1}`);
        await faucet(confidentialAddr1, 21); // L-BTC
        console.log(`Send 996699 VLP to ${confidentialAddr1}`);
        await mint(confidentialAddr1, 996699, 'Vulpem', 'VLP');
        console.log(`Send 4200 USDt to ${confidentialAddr1}`);
        await mint(confidentialAddr1, 4200, 'Tether USD', 'USDt');
      }
      if (utxosAddr2.length < 1) {
        console.log(`Send 100 STIKR to ${confidentialAddr2}`);
        await mint(confidentialAddr2, 100, 'Sticker pack', 'STIKR');
      }
      //
      const w = await xpubWalletFromAddresses(
        firstWallet.masterXPub.value,
        firstWallet.masterBlindingKey.value,
        [Address.create(confidentialAddr1), Address.create(confidentialAddr2)],
        'regtest'
      );
      //
      dispatch(
        setUtxos(
          (await w.getAddresses()).map((a) => ({
            confidentialAddress: a.confidentialAddress,
            blindingPrivateKey: a.blindingPrivateKey,
          })),
          () => onSuccess?.(),
          (error) => onError?.(error)
        )
      );
    } catch (error) {
      console.log(error.message);
    }
  };
}
