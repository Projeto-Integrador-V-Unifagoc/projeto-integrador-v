import { MatriculaService } from "../services/MatriculaSerices";

export class MatriculaController {
    matriculaService = new MatriculaService();

    async criarStatusMatriculaCurso(req: any, res: any) {
        try {
            const status = await this.matriculaService.criarStatusMatriculaCurso(req.body);
            res.status(201).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar status de matrícula do curso" });
        }
    }

    async listarStatusMatriculaCurso(req: any, res: any) {
        try {
            const status = await this.matriculaService.listarStatusMatriculaCurso();
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar status de matrícula do curso" });
        }
    }

    async buscarStatusMatriculaCursoPorId(req: any, res: any) {
        try {
            const status = await this.matriculaService.buscarStatusMatriculaCursoPorId(req.params.id);
            if (!status) {
                return res.status(404).json({ error: "Status de matrícula do curso não encontrado" });
            }
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar status de matrícula do curso" });
        }
    }
}
