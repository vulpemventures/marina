import React from 'react';
import { IAppState } from '../../domain/common';
import { appInitialState } from './reducers';

type ctx = [IAppState, React.Dispatch<unknown>];
export const AppContext = React.createContext<ctx>(appInitialState);
