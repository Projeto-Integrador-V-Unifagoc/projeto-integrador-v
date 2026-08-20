import { FaculdadeService } from "../service/FaculdadeService";

export class FaculdadeController {
    faculdadeService = new FaculdadeService();

    async listarFaculdades(req: any, res: any){
        try {
            const faculdades = await this.faculdadeService.listarFaculdades();
            res.status(200).json(faculdades);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar faculdades" });
        }
    }

    async criarFaculdade(req: any, res: any){
        try {
            const faculdade = await this.faculdadeService.criarFaculdade(req.body);
            res.status(201).json(faculdade);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar faculdade" });
        }
    }

    async buscarFaculdadePorId(req: any, res: any){
        try {
            const { id } = req.params
            const faculdade = await this.faculdadeService.buscarFaculdadePorId(id)
            res.status(200).json(faculdade)
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar faculdade" });
        }
    }
}