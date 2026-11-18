import { Router } from "express";
import { autenticar } from "../../middlewares/autenticacao";
import { soSecretaria } from "../../middlewares/autorizacao";
import { HorarioOfertaController } from "../horario-oferta/controller/HorarioOfertaController";

const controller = new HorarioOfertaController();
export const horarioOfertaRouter = Router();
horarioOfertaRouter.get("/turmas/:turmaId/horarios", autenticar, controller.listarTurma);
horarioOfertaRouter.get("/turmas-disciplinas/:ofertaId/horarios", autenticar, controller.listarOferta);
horarioOfertaRouter.post("/turmas-disciplinas/:ofertaId/horarios", autenticar, soSecretaria, controller.criar);
horarioOfertaRouter.put("/horarios-ofertas/:id", autenticar, soSecretaria, controller.atualizar);
horarioOfertaRouter.delete("/horarios-ofertas/:id", autenticar, soSecretaria, controller.remover);
