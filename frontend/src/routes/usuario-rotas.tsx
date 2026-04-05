import type { RouteObject } from 'react-router-dom';
import { Cadastro } from '../Pages/Cadastro/cadastro';
// import { Login } from '../Pages/Login';

// Exportamos apenas o "pedaço" das suas rotas
export const userRoutes: RouteObject[] = [
  {
    path: '/cadastro',
    element: <Cadastro />
  },
  {
    path: '/login',
    element: <div>Tela de Login</div> // Substitua pelo seu componente depois
  }
];