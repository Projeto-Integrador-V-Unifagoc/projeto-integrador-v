import { Request, Response } from "express";
import { CidadeService } from "../services/CidadeService";

export class CidadeController {
    private cidadeService = new CidadeService()

    async listarCidades(req: Request, res: Response) {

        const { ibge, nome, search, uf } = req.query

        const cidades = await this.cidadeService.listarCidades({
            ibge: ibge as string,
            nome: (nome || search) as string,
            uf: uf as string
        })
        return res.json(cidades)

    }

    async buscarCidadePorIbge(req: Request, res: Response) {

        const { ibge } = req.params
        const cidade = await this.cidadeService.buscarCidadePorIbge(ibge as string)
        return res.json(cidade)
    }

    async listarEstados(req: Request, res: Response) {
        const { search } = req.query
        const estados = await this.cidadeService.listarEstados(search as string)
        return res.json(estados)
    }
}
