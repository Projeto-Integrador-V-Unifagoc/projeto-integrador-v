import type { RouteObject } from 'react-router-dom';
import Usuarios from '../Pages/Usuario/Usuario';
import { Login } from '../Pages/Login/Login';

export const userRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/usuarios/lista',
    element: <Usuarios />
  },
  {
    path: '/cadastro',
    element: <Usuarios />
  }
];