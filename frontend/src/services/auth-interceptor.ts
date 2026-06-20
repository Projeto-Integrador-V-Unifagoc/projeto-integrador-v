import type { AxiosInstance } from 'axios';

const TOKEN_KEY = '@UniEduca:token';
const USER_KEY = '@UniEduca:user';

export function configurarSessaoDeslizante(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const tokenRenovado = response.headers['x-token-renovado'];
      if (tokenRenovado) {
        localStorage.setItem(TOKEN_KEY, tokenRenovado);
      }
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        // Evita loop de redirecionamento quando o próprio /login retorna 401.
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
}
