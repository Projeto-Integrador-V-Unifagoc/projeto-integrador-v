import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { regraPontuacaoController } from "../avaliacao/controller/RegraPontuacaoController";

export const regraPontuacaoRouter = Router();
regraPontuacaoRouter.use(autenticar);
regraPontuacaoRouter.get("/cursos/:cursoId/periodos/:periodoLetivoId", regraPontuacaoController.buscar);
regraPontuacaoRouter.put("/cursos/:cursoId/periodos/:periodoLetivoId", regraPontuacaoController.salvar);
