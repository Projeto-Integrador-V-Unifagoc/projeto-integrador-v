import axios from 'axios';
import { configurarSessaoDeslizante } from './auth-interceptor';
import { configurarLimiteDeRequisicoes } from './limite-requisicoes';

const usuarioApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

configurarSessaoDeslizante(usuarioApi);
configurarLimiteDeRequisicoes(usuarioApi);

export default usuarioApi;