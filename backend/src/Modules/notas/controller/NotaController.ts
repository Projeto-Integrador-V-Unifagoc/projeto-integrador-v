import type { Request, Response } from "express";
import { NotaError } from "../errors/NotaError.js";
import { NotaService } from "../service/NotaService.js";

export class NotaController {
  constructor(private service = new NotaService()) {}

  private erro(res: Response, error: unknown) {
    if (error instanceof NotaError) return res.status(error.status).json({ codigo: error.codigo, mensagem: error.message });
    console.error("Erro no módulo de notas", error);
    return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem: "Erro interno do servidor." });
  }

  listarOpcoes = async (req: Request, res: Response) => {
    try { return res.json(await this.service.listarOpcoes(req)); } catch (e) { return this.erro(res, e); }
  };
  obterLancamento = async (req: Request, res: Response) => {
    try { return res.json(await this.service.obterLancamento(String(req.params.avaliacaoId), req)); } catch (e) { return this.erro(res, e); }
  };
  salvarLote = async (req: Request, res: Response) => {
    try { return res.json(await this.service.salvarLote(String(req.params.avaliacaoId), req.body, req)); } catch (e) { return this.erro(res, e); }
  };
  obterRendimento = async (req: Request, res: Response) => {
    try { return res.json(await this.service.obterRendimento(String(req.params.turmaDisciplinaId), req)); } catch (e) { return this.erro(res, e); }
  };
  obterRecuperacao = async (req: Request, res: Response) => {
    try { return res.json(await this.service.obterRecuperacao(String(req.params.turmaDisciplinaId), req)); } catch (e) { return this.erro(res, e); }
  };
  criarAutorizacao = async (req: Request, res: Response) => {
    try { return res.status(201).json(await this.service.criarAutorizacaoExcepcional(req.body, req)); } catch (e) { return this.erro(res, e); }
  };
  meuBoletim = async (req: Request, res: Response) => {
    try { return res.json(await this.service.meuBoletim(req, req.query.periodoId as string | undefined)); } catch (e) { return this.erro(res, e); }
  };
  meuResumo = async (req: Request, res: Response) => {
    try { return res.json(await this.service.meuResumo(req)); } catch (e) { return this.erro(res, e); }
  };
  consultarAluno = async (req: Request, res: Response) => {
    try { return res.json(await this.service.consultarAluno(String(req.params.alunoId), req)); } catch (e) { return this.erro(res, e); }
  };
}
