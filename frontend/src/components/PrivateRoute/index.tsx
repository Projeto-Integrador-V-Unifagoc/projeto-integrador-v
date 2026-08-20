import { Navigate } from 'react-router-dom';
import type { JSX } from 'react/jsx-runtime';
import { Perfil } from '../../enums/perfil';

interface PrivateRouteProps {
  children: JSX.Element;
  perfisPermitidos?: Perfil[];
}

export function PrivateRoute({
  children,
  perfisPermitidos,
}: PrivateRouteProps) {
  const token = localStorage.getItem('@UniEduca:token');
  const usuarioStorage = localStorage.getItem('@UniEduca:user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!usuarioStorage) {
    return <Navigate to="/login" replace />;
  }

  const usuario = JSON.parse(usuarioStorage);

  if (
    perfisPermitidos &&
    !perfisPermitidos.includes(usuario.tipo_usuario)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}