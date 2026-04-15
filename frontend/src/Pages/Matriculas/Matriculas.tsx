import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api"
});

export const listarMatriculas = () => {
  return api.get("/matriculas");
};

export const criarMatricula = (data: any) => {
  return api.post("/matriculas", data);
};