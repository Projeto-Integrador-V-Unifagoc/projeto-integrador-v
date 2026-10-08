import { responderErroEstrutura } from "./erroEstrutura";
import { TurmaService } from "../service/TurmaService";

export class TurmaController {
    turmaService = new TurmaService();

    async criarTurma(req: any, res: any) {
        try {
            const turma = await this.turmaService.criarTurma(req.body);
            res.status(201).json(turma);
        } catch (error) {
            responderErroEstrutura(res, error);
        }
    }

    async listarTurmas(req: any, res: any) {
        try {
            const turmas = await this.turmaService.listarTurmas();
            res.status(200).json(turmas);
        } catch (error) {
            responderErroEstrutura(res, error);
        }
    }

    async buscarTurmaPorId(req: any, res: any) {
        try {
            const turma = await this.turmaService.buscarTurmaPorId(req.params.id);

            if (!turma) {
                return res.status(404).json({ error: "Turma nao encontrada" });
            }

            res.status(200).json(turma);
        } catch (error) {
            responderErroEstrutura(res, error);
        }
    }

    async atualizarTurma(req: any, res: any) {
        try {
            const turma = await this.turmaService.atualizarTurma(req.params.id, req.body);

            if (!turma) {
                return res.status(404).json({ error: "Turma nao encontrada" });
            }

            res.status(200).json(turma);
        } catch (error) {
            responderErroEstrutura(res, error);
        }
    }

    async removerTurma(req: any, res: any) {
        try {
            const removidos = await this.turmaService.removerTurma(req.params.id);

            if (!removidos) {
                return res.status(404).json({ error: "Turma nao encontrada" });
            }

            res.status(204).send();
        } catch (error) {
            responderErroEstrutura(res, error);
        }
    }
}
