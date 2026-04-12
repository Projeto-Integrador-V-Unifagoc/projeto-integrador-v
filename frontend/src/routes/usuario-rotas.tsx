import type { RouteObject } from 'react-router-dom';
import Cadastro from '../Pages/Usuario/Usuario';
import { Login } from '../Pages/Login/Login';

export const userRoutes: RouteObject[] = [
  {
    path: '/cadastro',
    element: <Cadastro />
  },
  {
    path: '/login',
    element: <Login />
  }
];