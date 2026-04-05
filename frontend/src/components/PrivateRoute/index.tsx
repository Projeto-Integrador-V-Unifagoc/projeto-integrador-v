import { Navigate } from 'react-router-dom';
import type { JSX } from 'react/jsx-runtime';

interface PrivateRouteProps {
  children: JSX.Element;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  // Verificamos se o token que salvamos no login existe
  const token = localStorage.getItem('@UniEduca:token');

  // Se NÃO existir token, mandamos o usuário de volta para o Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Se existir, permitimos que ele veja a página (children)
  return children;
}