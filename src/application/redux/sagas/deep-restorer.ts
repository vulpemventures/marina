import { AccountID } from "../../../domain/account";
import { SagaGenerator, selectAccountSaga } from "./utils";

function* deepRestore(accountID: AccountID, gapLimit: number, explorerURL: string): SagaGenerator<void> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;

  const toRestore
}