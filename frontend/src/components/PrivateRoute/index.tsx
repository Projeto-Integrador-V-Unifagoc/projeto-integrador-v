import { Navigate } from 'react-router-dom';
import type { JSX } from 'react/jsx-runtime';

interface PrivateRouteProps {
  children: JSX.Element;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const token = localStorage.getItem('@UniEduca:token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}