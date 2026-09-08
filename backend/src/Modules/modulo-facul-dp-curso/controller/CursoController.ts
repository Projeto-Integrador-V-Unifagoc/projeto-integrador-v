import { CursoService } from "../service/CursoService";
import { responderErroEstruturaAcademica } from "../../modulo-estrutura-academica/errors/EstruturaAcademicaError";

export default class CursoController {
    cursoService = new CursoService();

    async criarCurso(req: any, res: any) {
        try {
            const curso = await this.cursoService.criarCurso(req.body);
            res.status(201).json(curso);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async listarCursos(req: any, res: any) {
        try {
            const cursos = await this.cursoService.listarCursos();
            res.status(200).json(cursos);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async buscarCursoPorId(req: any, res: any) {
        try {
            const curso = await this.cursoService.buscarCursoPorId(req.params.id);
            if (!curso) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            res.status(200).json(curso);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async atualizarCurso(req: any, res: any) {
        try {
            const curso = await this.cursoService.atualizarCurso(req.params.id, req.body);
            if (!curso) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            res.status(200).json(curso);
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }

    async removerCurso(req: any, res: any) {
        try {
            const removidos = await this.cursoService.removerCurso(req.params.id);
            if (!removidos) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            res.status(204).send();
        } catch (error) {
            responderErroEstruturaAcademica(res, error);
        }
    }
}
