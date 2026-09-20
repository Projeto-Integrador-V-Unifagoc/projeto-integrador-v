import type { AxiosInstance } from "axios";

const TOKEN_KEY = "@UniEduca:token";
const USER_KEY = "@UniEduca:user";

const ROTAS_PUBLICAS = [
  "/",
  "/inscricao",
  "/reenviar-documentos",
  "/sobre",
  "/cursos",
  "/noticias",
  "/galeria",
  "/contato",
  "/login",
  "/esqueceu-senha",
  "/redefinir-senha",
];

const PREFIXOS_PUBLICOS = ["/noticias/", "/galeria/"];

function emRotaPublica(): boolean {
  const caminho = window.location.pathname.replace(/\/+$/, "") || "/";

  return (
    ROTAS_PUBLICAS.includes(caminho) ||
    PREFIXOS_PUBLICOS.some((prefixo) => caminho.startsWith(prefixo))
  );
}

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
      const tokenRenovado = response.headers["x-token-renovado"];

      if (tokenRenovado) {
        localStorage.setItem(TOKEN_KEY, tokenRenovado);
      }

      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        const caminho = window.location.pathname;

        if (caminho.startsWith("/painel")) {
          if (caminho !== "/painel/login") {
            window.location.href = "/painel/login";
          }
        } else if (!emRotaPublica()) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }
  );
}
