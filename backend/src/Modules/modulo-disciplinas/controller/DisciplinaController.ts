import { DisciplinaService } from "../service/DisciplinaService";

export class DisciplinaController {
    disciplinaService = new DisciplinaService();

    async criarDisciplina(req: any, res: any) {
        try {
            const disciplina = await this.disciplinaService.criarDisciplina(req.body);
            res.status(201).json(disciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarDisciplinas(req: any, res: any) {
        try {
            const disciplinas = await this.disciplinaService.listarDisciplinas();
            res.status(200).json(disciplinas);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async buscarDisciplinaPorId(req: any, res: any) {
        try {
            const disciplina = await this.disciplinaService.buscarDisciplinaPorId(req.params.id);

            if (!disciplina) {
                return res.status(404).json({ error: "Disciplina não encontrada" });
            }

            res.status(200).json(disciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarDisciplina(req: any, res: any) {
        try {
            const disciplina = await this.disciplinaService.atualizarDisciplina(req.params.id, req.body);

            if (!disciplina) {
                return res.status(404).json({ error: "Disciplina não encontrada" });
            }

            res.status(200).json(disciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async removerDisciplina(req: any, res: any) {
        try {
            const removidos = await this.disciplinaService.removerDisciplina(req.params.id);

            if (!removidos) {
                return res.status(404).json({ error: "Disciplina não encontrada" });
            }

            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
