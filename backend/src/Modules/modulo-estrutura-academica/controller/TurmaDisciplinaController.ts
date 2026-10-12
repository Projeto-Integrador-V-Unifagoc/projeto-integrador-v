import { responderErroEstrutura } from "./erroEstrutura";
import { TurmaDisciplinaService } from "../service/TurmaDisciplinaService";

export class TurmaDisciplinaController {
    turmaDisciplinaService = new TurmaDisciplinaService();

    async criarTurmaDisciplina(req: any, res: any) {
        try {
            const turmaDisciplina = await this.turmaDisciplinaService.criarTurmaDisciplina(req.params.id, req.body);
            res.status(201).json(turmaDisciplina);
        } catch (error) {
            responderErroEstrutura(res, error);
        }
    }

    async listarTurmaDisciplinasPorTurmaId(req: any, res: any) {
        try {
            const turmaDisciplinas = await this.turmaDisciplinaService.listarTurmaDisciplinasPorTurmaId(req.params.id);
            res.status(200).json(turmaDisciplinas);
        } catch (error) {
            responderErroEstrutura(res, error);
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
            responderErroEstrutura(res, error);
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
            responderErroEstrutura(res, error);
        }
    }
}
