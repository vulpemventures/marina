import React from 'react';
import { UnblindedOutput } from '../../domain/transaction';

export interface SpendPopupResponse {
  accepted: boolean;
  signedTxHex?: string;
  selectedUtxos?: UnblindedOutput[];
}

const ConnectSpend: React.FC = () => {
  // const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  // const [error, setError] = useState<string>('');

  // const popupWindowProxy = new PopupWindowProxy<SpendPopupResponse>();

  // const handleModalUnlockClose = () => showUnlockModal(false);
  // const handleUnlockModalOpen = () => showUnlockModal(true);

  // const sendResponseMessage = (
  //   accepted: boolean,
  //   signedTxHex?: string,
  //   selectedUtxos?: UnblindedOutput[],
  // ) => {
  //   return popupWindowProxy.sendResponse({
  //     data: { accepted, signedTxHex, selectedUtxos, unconfirmedOutputs },
  //   });
  // };

  // const handleReject = async () => {
  //   try {
  //     // Flush tx data
  //     await dispatch(flushTx());
  //     await sendResponseMessage(false);
  //   } catch (e) {
  //     console.error(e);
  //   }
  //   window.close();
  // };

  // // send response message false when user closes the window without answering
  // window.addEventListener('beforeunload', () => sendResponseMessage(false));

  return <></>
    // <ShellConnectPopup
    //   className="h-popupContent max-w-sm pb-20 text-center bg-bottom bg-no-repeat"
    //   currentPage="Spend"
    // >
  //    {error.length === 0 ? (
  //       <>
  //         <h1 className="mt-8 text-2xl font-medium break-all">{connectData.tx?.hostname}</h1>

  //         <p className="mt-4 text-base font-medium">Requests you to spend</p>

  //         <div className="h-64 mt-4 overflow-y-auto">
  //           {connectData.tx?.recipients?.map((recipient: RecipientInterface, index) => (
  //             <div key={index}>
  //               <div className="container flex justify-between mt-6">
  //                 <span className="text-lg font-medium">{fromSatoshi(recipient.value)}</span>
  //                 <span className="text-lg font-medium">{getTicker(recipient.asset)}</span>
  //               </div>
  //               <div className="container flex items-baseline justify-between">
  //                 <span className="mr-2 text-lg font-medium">To: </span>
  //                 <span className="font-small text-sm break-all">
  //                   {formatAddress(recipient.address)}
  //                 </span>
  //               </div>
  //             </div>
  //           ))}
  //         </div>

  //         <ButtonsAtBottom>
  //           <Button isOutline={true} onClick={handleReject} textBase={true}>
  //             Reject
  //           </Button>
  //           <Button onClick={handleUnlockModalOpen} textBase={true}>
  //             Accept
  //           </Button>
  //         </ButtonsAtBottom>
  //       </>
  //     ) : (
  //       <div className="flex flex-col justify-center p-2 align-middle">
  //         <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
  //         <span className="max-w-xs mr-2 font-light">{error}</span>
  //         <img className="mx-auto my-10" src="/assets/images/cross.svg" alt="error" />
  //         <Button
  //           className="w-36 container mx-auto mt-10"
  //           onClick={handleUnlockModalOpen}
  //           textBase={true}
  //         >
  //           Unlock
  //         </Button>
  //       </div>
  //     )}
  //     <ModalUnlock
  //       isModalUnlockOpen={isModalUnlockOpen}
  //       handleModalUnlockClose={handleModalUnlockClose}
  //       handleUnlock={handleUnlock}
  //     />
    // </ShellConnectPopup >
// );
};

export default ConnectSpend;
