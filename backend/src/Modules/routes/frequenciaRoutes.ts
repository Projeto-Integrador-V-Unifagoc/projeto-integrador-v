import { Router } from "express";
import { FrequenciaController } from "../frequencia/controller/FrequenciaController";

const frequenciaController = new FrequenciaController();
export const frequenciaRouter = Router();

frequenciaRouter.post("/", (req, res) => frequenciaController.registrarFrequencia(req, res));
