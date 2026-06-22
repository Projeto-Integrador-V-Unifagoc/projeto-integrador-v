import axios from "axios";
import { configurarSessaoDeslizante } from "./auth-interceptor";

const api = axios.create({
  baseURL: "http://localhost:3000",
});

configurarSessaoDeslizante(api);

export default api;
