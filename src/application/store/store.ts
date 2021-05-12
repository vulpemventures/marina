import { createStore } from 'redux';
import marinaReducer from './reducers';

const marinaStore = createStore(marinaReducer);

export type RootState = ReturnType<typeof marinaStore.getState>;
export type AppDispatch = typeof marinaStore.dispatch;
export default marinaStore;