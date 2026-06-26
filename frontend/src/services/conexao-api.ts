import axios from "axios";
import { configurarSessaoDeslizante } from "./auth-interceptor";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});

configurarSessaoDeslizante(api);

export default api;
