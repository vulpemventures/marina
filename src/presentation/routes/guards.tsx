import React, { useContext } from 'react';
import { Route, Redirect, RouteProps, RouteComponentProps, useParams } from 'react-router-dom';
import { AppContext } from '../../application/store/context';
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
  comp: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ comp: Component, ...rest }) => {
  const appCtx = useContext(AppContext);
  const isAuthenticated = appCtx?.[0]?.app.isAuthenticated;

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
