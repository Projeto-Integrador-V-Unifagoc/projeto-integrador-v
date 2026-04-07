import { Request, Response } from "express";
import { CidadeService } from "../services/CidadeService";

export class CidadeController {
    private cidadeService = new CidadeService()

    async listarCidades(req: Request, res: Response) {

        const { ibge } = req.query

        const cidades = await this.cidadeService.listarCidades({
            ibge: ibge as string
        })
        return res.json(cidades)
    }
}