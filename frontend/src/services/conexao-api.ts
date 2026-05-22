import axios from "axios";

// Criamos uma instância do Axios para não precisar repetir a URL em todo lugar
const api = axios.create({
  // Coloquei a porta 3333 que é o padrão que estamos usando no Node.js
  baseURL: 'http://localhost:3000', 
});

export default api;