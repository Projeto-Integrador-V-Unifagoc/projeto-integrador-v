import { Router } from "express";
import { getAvaliacoes } from "../modules/avaliacoes-vinculo/controller/avaliacao-controller.js";
const routes = Router();
routes.get('/avaliacoes', getAvaliacoes);
export default routes;
//# sourceMappingURL=routes-avaliacoes.js.map