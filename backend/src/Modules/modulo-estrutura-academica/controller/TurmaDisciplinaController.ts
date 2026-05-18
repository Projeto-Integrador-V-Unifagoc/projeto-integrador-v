import { TurmaDisciplinaService } from "../service/TurmaDisciplinaService";

export class TurmaDisciplinaController {
    turmaDisciplinaService = new TurmaDisciplinaService();

    async criarTurmaDisciplina(req: any, res: any) {
        try {
            const turmaDisciplina = await this.turmaDisciplinaService.criarTurmaDisciplina(req.params.id, req.body);
            res.status(201).json(turmaDisciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarTurmaDisciplinasPorTurmaId(req: any, res: any) {
        try {
            const turmaDisciplinas = await this.turmaDisciplinaService.listarTurmaDisciplinasPorTurmaId(req.params.id);
            res.status(200).json(turmaDisciplinas);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarTurmaDisciplina(req: any, res: any) {
        try {
            const turmaDisciplina = await this.turmaDisciplinaService.atualizarTurmaDisciplina(
                req.params.id,
                req.params.turmaDisciplinaId,
                req.body
            );

            if (!turmaDisciplina) {
                return res.status(404).json({ error: "Disciplina da turma nao encontrada" });
            }

            res.status(200).json(turmaDisciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async removerTurmaDisciplina(req: any, res: any) {
        try {
            const removidos = await this.turmaDisciplinaService.removerTurmaDisciplina(
                req.params.id,
                req.params.turmaDisciplinaId
            );

            if (!removidos) {
                return res.status(404).json({ error: "Disciplina da turma nao encontrada" });
            }

            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
