import React from 'react';
import { useSelector } from 'react-redux';
import type { RouteProps, RouteComponentProps } from 'react-router-dom';
import { Route, Redirect, useParams } from 'react-router-dom';
import type { PendingTxStep } from '../../application/redux/reducers/transaction-reducer';
import type { RootReducerState } from '../../domain/common';
import {
  CONNECT_ENABLE_ROUTE,
  CONNECT_SPEND_ROUTE,
  SEND_ADDRESS_AMOUNT_ROUTE,
  SEND_CHOOSE_FEE_ROUTE,
  SEND_CONFIRMATION_ROUTE,
} from './constants';

const ALLOWED_REDIRECT_ROUTE = [CONNECT_ENABLE_ROUTE, CONNECT_SPEND_ROUTE];

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

/**
 * A wrapper for <Route> that redirects to the login screen if you're not yet authenticated
 *
 * @param component A route component
 * @param rest The rest of Route props
 * @returns A route component
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  component: Component,
  ...rest
}) => {
  const isAuthenticated = useSelector((state: RootReducerState) => state.app.isAuthenticated);

  // we check if an optional param is given
  // redirect to enable and spend connect page
  const { id }: { id?: string } = useParams();
  const idWithSlash = `/${id}`;

  return (
    <Route
      {...rest}
      render={(props) =>
        // TODO check if the website is enabled
        // before redirecting to spend page
        idWithSlash && ALLOWED_REDIRECT_ROUTE.includes(idWithSlash) ? (
          <Redirect to={{ pathname: idWithSlash }} />
        ) : isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect
            to={{
              pathname: '/login',
              state: { from: props.location },
            }}
          />
        )
      }
    />
  );
};

/**
 * like ProtectedRoute but with redirect logic in case of transaction step
 */
export const ProtectedRedirectRoute: React.FC<ProtectedRouteProps> = ({
  component: Component,
  ...rest
}) => {
  const transactionStep = useSelector((state: RootReducerState) => state.transaction.step);
  const isAuthenticated = useSelector((state: RootReducerState) => state.app.isAuthenticated);

  const stepToPathName = (step: PendingTxStep) => {
    switch (step) {
      case 'address-amount':
        return SEND_ADDRESS_AMOUNT_ROUTE;
      case 'choose-fee':
        return SEND_CHOOSE_FEE_ROUTE;
      case 'confirmation':
        return SEND_CONFIRMATION_ROUTE;
    }
  };

  return (
    <Route
      {...rest}
      render={(props) => {
        if (!isAuthenticated) {
          return (
            <Redirect
              to={{
                pathname: '/login',
                state: { from: props.location },
              }}
            />
          );
        }
        const transactionPath = stepToPathName(transactionStep);
        if (transactionPath) {
          return <Redirect to={{ pathname: transactionPath }} />;
        }
        return <Component {...props} />;
      }}
    />
  );
};
