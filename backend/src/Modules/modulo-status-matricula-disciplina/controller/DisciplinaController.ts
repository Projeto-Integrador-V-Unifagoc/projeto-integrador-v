import { DisciplinaService } from "../services/DisciplinaServices";

export class StatusDisciplinaController {
    disciplinaService = new DisciplinaService();

    async criarStatusMatriculaDisciplina(req: any, res: any) {
        try {
            const status = await this.disciplinaService.criarStatusMatriculaDisciplina(req.body);
            res.status(201).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar status de matrícula da disciplina" });
        }
    }

    async listarStatusMatriculaDisciplina(req: any, res: any) {
        try {
            const status = await this.disciplinaService.listarStatusMatriculaDisciplina();
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar status de matrícula da disciplina" });
        }
    }

    async buscarStatusMatriculaDisciplinaPorId(req: any, res: any) {
        try {
            const status = await this.disciplinaService.buscarStatusMatriculaDisciplinaPorId(req.params.id);
            if (!status) {
                return res.status(404).json({ error: "Status de matrícula da disciplina não encontrado" });
            }
            res.status(200).json(status);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar status de matrícula da disciplina" });
        }
    }
}
