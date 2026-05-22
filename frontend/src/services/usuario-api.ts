import axios from 'axios';

const usuarioApi = axios.create({
  baseURL: 'http://localhost:3000',
});

usuarioApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('@UniEduca:token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default usuarioApi;