import { TurmaDisciplinaService } from "../service/TurmaDisciplinaService";
import { responderErroEstruturaAcademica } from "../errors/EstruturaAcademicaError";

export class TurmaDisciplinaController {
    turmaDisciplinaService = new TurmaDisciplinaService();

    async criarTurmaDisciplina(req: any, res: any) {
        try {
            const turmaDisciplina = await this.turmaDisciplinaService.criarTurmaDisciplina(req.params.id, req.body);
            res.status(201).json(turmaDisciplina);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async listarTurmaDisciplinasPorTurmaId(req: any, res: any) {
        try {
            const turmaDisciplinas = await this.turmaDisciplinaService.listarTurmaDisciplinasPorTurmaId(req.params.id);
            res.status(200).json(turmaDisciplinas);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
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
            responderErroEstruturaAcademica(res, error);
        }
    }

    async obterDependencias(req: any, res: any) {
        try {
            const dependencias = await this.turmaDisciplinaService.obterDependencias(
                req.params.id,
                req.params.turmaDisciplinaId
            );

            if (!dependencias) {
                return res.status(404).json({ error: "Disciplina da turma nao encontrada" });
            }

            res.status(200).json(dependencias);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
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
            responderErroEstruturaAcademica(res, error);
        }
    }
}
