import { Request, Response } from "express";
import { CidadeService } from "../services/CidadeService";

export class CidadeController {
    private cidadeService = new CidadeService()

    async listarCidades(req: Request, res: Response) {

        const { ibge, nome } = req.query

        const cidades = await this.cidadeService.listarCidades({
            ibge: ibge as string,
            nome: nome as string
        })
        return res.json(cidades)

    }

    async buscarCidadePorIbge(req: Request, res: Response) {

        const { ibge } = req.params
        const cidade = await this.cidadeService.buscarCidadePorIbge(ibge as string)
        return res.json(cidade)
    }
}
