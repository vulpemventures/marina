import { createStore } from 'redux';
import marinaReducer from './reducers';

const marinaStore = createStore(marinaReducer);

export default marinaStore;