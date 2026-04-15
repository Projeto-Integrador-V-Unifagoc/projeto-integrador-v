import { DepartamentoService } from "../service/DepartamentoService";

export class DepartamentoController {
    departamentoService = new DepartamentoService();

    async listarDepartamentos(req: any, res: any){
        try {
            const departamentos = await this.departamentoService.listarDepartamentos();
            res.status(200).json(departamentos);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar departamentos" });
        }
    }

    async criarDepartamento(req: any, res: any){
        try {
            const departamento = await this.departamentoService.criarDepartamento(req.body);
            res.status(201).json(departamento);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar departamento" });
        }
    }

    async buscarDepartamentoPorId(req: any, res: any){
        try {
            const { id } = req.params
            const departamento = await this.departamentoService.buscarDepartamentoPorId(id)
            res.status(200).json(departamento)
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar departamento" });
        }
    }
}