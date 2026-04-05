import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL?.toString().trim() || "http://localhost:3000";

const matriculaApi = axios.create({
  baseURL,
  timeout: 15000,
});

matriculaApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      return Promise.reject(
        new Error(
          `Sem conexao com a API (${baseURL}). Confira se o backend esta rodando.`
        )
      );
    }
    return Promise.reject(error);
  }
);

export default matriculaApi;
export { baseURL };
