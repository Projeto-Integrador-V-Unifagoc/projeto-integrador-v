import { Router } from "express";
import { deletarAvaliacao } from "../modules/avaliacoes-vinculo/controller/avaliacao-controller.js";

const routes = Router();

routes.delete('/avaliacoes', deletarAvaliacao);

export default routes;