import React, { useContext } from 'react';
import { Route, Redirect, RouteProps, RouteComponentProps } from 'react-router-dom';
import { AppContext } from '../../application/background_script';

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
  console.log('rest', rest);
  const appCtx = useContext(AppContext);
  console.log('appCtx', appCtx);
  const isAuthenticated = appCtx?.[0]?.app.isAuthenticated;
  console.log('isAuthenticated', isAuthenticated);

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
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
