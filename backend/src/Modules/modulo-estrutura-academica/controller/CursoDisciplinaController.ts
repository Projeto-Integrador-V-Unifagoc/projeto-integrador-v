import { CursoDisciplinaService } from "../service/CursoDisciplinaService";
import { responderErroEstruturaAcademica } from "../errors/EstruturaAcademicaError";

export class CursoDisciplinaController {
    cursoDisciplinaService = new CursoDisciplinaService();

    async criarCursoDisciplina(req: any, res: any) {
        try {
            const cursoDisciplina = await this.cursoDisciplinaService.criarCursoDisciplina(req.body);
            res.status(201).json(cursoDisciplina);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async listarCursoDisciplinas(req: any, res: any) {
        try {
            const cursoDisciplinas = await this.cursoDisciplinaService.listarCursoDisciplinas();
            res.status(200).json(cursoDisciplinas);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async listarMatrizCurricularPorCursoId(req: any, res: any) {
        try {
            const periodo = req.query.periodo !== undefined ? Number(req.query.periodo) : undefined;
            const matrizCurricular = await this.cursoDisciplinaService.listarMatrizCurricularPorCursoId(req.params.id, periodo);
            res.status(200).json(matrizCurricular);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
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
            responderErroEstruturaAcademica(res, error);
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
            responderErroEstruturaAcademica(res, error);
        }
    }
}
