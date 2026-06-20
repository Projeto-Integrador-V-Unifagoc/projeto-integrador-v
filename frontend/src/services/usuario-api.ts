import axios from 'axios';
import { configurarSessaoDeslizante } from './auth-interceptor';

const usuarioApi = axios.create({
  baseURL: 'http://localhost:3000',
});

configurarSessaoDeslizante(usuarioApi);

export default usuarioApi;