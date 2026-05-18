import { CursoDisciplinaService } from "../service/CursoDisciplinaService";

export class CursoDisciplinaController {
    cursoDisciplinaService = new CursoDisciplinaService();

    async criarCursoDisciplina(req: any, res: any) {
        try {
            const cursoDisciplina = await this.cursoDisciplinaService.criarCursoDisciplina(req.body);
            res.status(201).json(cursoDisciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarCursoDisciplinas(req: any, res: any) {
        try {
            const cursoDisciplinas = await this.cursoDisciplinaService.listarCursoDisciplinas();
            res.status(200).json(cursoDisciplinas);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async listarMatrizCurricularPorCursoId(req: any, res: any) {
        try {
            const matrizCurricular = await this.cursoDisciplinaService.listarMatrizCurricularPorCursoId(req.params.id);
            res.status(200).json(matrizCurricular);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async atualizarCursoDisciplina(req: any, res: any) {
        try {
            const cursoDisciplina = await this.cursoDisciplinaService.atualizarCursoDisciplina(req.params.id, req.body);

            if (!cursoDisciplina) {
                return res.status(404).json({ error: "Associacao curso disciplina nao encontrada" });
            }

            res.status(200).json(cursoDisciplina);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    async removerCursoDisciplina(req: any, res: any) {
        try {
            const removidos = await this.cursoDisciplinaService.removerCursoDisciplina(req.params.id);

            if (!removidos) {
                return res.status(404).json({ error: "Associacao curso disciplina nao encontrada" });
            }

            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }
}
