import { Router } from "express";
import { getAvaliacoes } from "../modules/avaliacoes-vinculo/controller/avaliacao-controller.js";

const routes = Router();

// Chamando a função do Controller que usa o Repository
routes.get('/avaliacoes', getAvaliacoes);

export default routes;