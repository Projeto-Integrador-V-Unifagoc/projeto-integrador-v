import { Request, Response } from "express";
import { FaculdadeService } from "../service/FaculdadeService";

export class FaculdadeController {
    faculdadeService = new FaculdadeService();

    async listarFaculdades(req: Request, res: Response){
        try {
            const faculdades = await this.faculdadeService.listarFaculdades();
            res.status(200).json(faculdades);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar faculdades" });
        }
    }

    async criarFaculdade(req: Request, res: Response){
        try {
            const faculdade = await this.faculdadeService.criarFaculdade(req.body);
            res.status(201).json(faculdade);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar faculdade" });
        }
    }

    async buscarFaculdadePorId(req: Request, res: Response){
        try {
            const { id } = req.params
            const faculdade = await this.faculdadeService.buscarFaculdadePorId(String(id))
            res.status(200).json(faculdade)
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar faculdade" });
        }
    }
}