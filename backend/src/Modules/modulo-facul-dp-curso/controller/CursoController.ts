import { Request, Response } from "express";
import { CursoService } from "../service/CursoService";

export default class CursoController {
    cursoService = new CursoService();

    async criarCurso(req: Request, res: Response) {
        try {
            const curso = await this.cursoService.criarCurso(req.body);
            res.status(201).json(curso);
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar curso" });
        }
    }

    async listarCursos(req: Request, res: Response) {
        try {
            const cursos = await this.cursoService.listarCursos();
            res.status(200).json(cursos);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar cursos" });
        }
    }

    async buscarCursoPorId(req: Request, res: Response) {
        try {
            const curso = await this.cursoService.buscarCursoPorId(String(req.params.id));
            if (!curso) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            res.status(200).json(curso);
        } catch (error) {
            res.status(500).json({ error: "Erro ao buscar curso" });
        }
    }

    async atualizarCurso(req: Request, res: Response) {
        try {
            const curso = await this.cursoService.atualizarCurso(String(req.params.id), req.body);
            if (!curso) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            res.status(200).json(curso);
        } catch (error) {
            res.status(500).json({ error: "Erro ao atualizar curso" });
        }
    }

    async removerCurso(req: Request, res: Response) {
        try {
            const removidos = await this.cursoService.removerCurso(String(req.params.id));
            if (!removidos) {
                return res.status(404).json({ error: "Curso não encontrado" });
            }
            res.status(204).send();
        } catch (error) {
            const mensagem = (error as Error).message;
            const status = mensagem.startsWith("Nao e possivel remover o curso") ? 400 : 500;

            res.status(status).json({ error: mensagem });
        }
    }
}
