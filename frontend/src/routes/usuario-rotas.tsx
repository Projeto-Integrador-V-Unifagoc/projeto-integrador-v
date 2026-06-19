import type { RouteObject } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import Usuarios from '../Pages/Usuario/Usuario';
import { Login } from '../Pages/Login/Login';
import { Perfil } from '../enums/perfil';

function RotaProtegida({
  children,
  perfisPermitidos,
}: {
  children: ReactElement;
  perfisPermitidos: Perfil[];
}) {
  const storedUser = localStorage.getItem('@UniEduca:user');

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  const usuario = JSON.parse(storedUser);

  if (!perfisPermitidos.includes(usuario.tipo_usuario)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export const userRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/usuarios/lista',
    element: (
      <RotaProtegida perfisPermitidos={[Perfil.SECRETARIA, Perfil.ADMINISTRADOR]}>
        <Usuarios />
      </RotaProtegida>
    ),
  },
  {
    path: '/cadastro',
    element: (
      <RotaProtegida perfisPermitidos={[Perfil.SECRETARIA, Perfil.ADMINISTRADOR]}>
        <Usuarios />
      </RotaProtegida>
    ),
  },
];