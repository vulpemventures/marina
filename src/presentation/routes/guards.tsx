import React from 'react';
import { useSelector } from 'react-redux';
import type { RouteProps, RouteComponentProps } from 'react-router-dom';
import { Route, Redirect, useParams } from 'react-router-dom';
import type { RootReducerState } from '../../domain/common';
import { CONNECT_ENABLE_ROUTE, CONNECT_SPEND_ROUTE } from './constants';

const ALLOWED_REDIRECT_ROUTE = [CONNECT_ENABLE_ROUTE, CONNECT_SPEND_ROUTE];

/**
 * A wrapper for <Route> that redirects to the login screen if you're not yet authenticated
 *
 * @param comp A route component
 * @param rest The rest of props
 * @returns A route component
 */

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

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
