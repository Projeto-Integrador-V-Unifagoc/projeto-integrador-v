import type { AxiosInstance } from "axios";

export function configurarSessaoDeslizante(api: AxiosInstance) {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("@UniEduca:token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });
}
