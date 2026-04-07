import { Request, Response } from "express";
import { CidadeService } from "../services/CidadeService";

export class CidadeController {
    private cidadeService = new CidadeService()

    async listarCidades(req: Request, res: Response) {
        const cidades = await this.cidadeService.listarCidades()
        return res.json(cidades)
    }
}