import { fetchUtxos, mint } from './_regtest';
import { deriveNewAddress, setUtxos } from '../src/application/store/actions';
import { xpubWalletFromAddresses } from '../src/application/utils/restorer';
import { Thunk, IAppState, Action } from '../src/domain/common';
import { Address } from '../src/domain/wallet/value-objects';

export function createDevState(
  onSuccess?: () => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState) => {
    const { wallets } = getState();
    const firstWallet = wallets[0];
    const deriveNewAddressAction = function (): Promise<string> {
      return new Promise((resolve, reject) => {
        dispatch(
          deriveNewAddress(
            false,
            (confidentialAddress) => {
              resolve(confidentialAddress);
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
        await mint(confidentialAddr1, 21, 'Liquid Bitcoin', 'L-BTC');
        await mint(confidentialAddr1, 996699, 'Vulpem', 'VLP');
        await mint(confidentialAddr1, 4200, 'Tether USD', 'USDt');
      }
      if (utxosAddr2.length < 1) {
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
          w.getAddresses().map((a) => ({
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
