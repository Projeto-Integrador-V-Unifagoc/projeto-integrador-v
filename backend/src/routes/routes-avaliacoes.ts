import { Router } from "express";
import { deletarAvaliacao } from "../modules/avaliacoes-vinculo/controller/avaliacao-controller.js";
import { getAvaliacoes } from "../modules/avaliacoes-vinculo/controller/avaliacao-controller.js";

const routes = Router();

routes.delete('/avaliacoes', deletarAvaliacao);

// Chamando a função do Controller que usa o Repository
routes.get('/avaliacoes', getAvaliacoes);

export default routes;