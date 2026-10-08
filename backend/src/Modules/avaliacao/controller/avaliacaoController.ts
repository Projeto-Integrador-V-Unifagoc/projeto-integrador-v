import type { Request, Response } from "express";
import { avaliacaoService } from "../services/avaliacaoServices.js";
import db from "../../../database/index";
import { RegraPontuacaoRepository } from "../repository/RegraPontuacaoRepository";
import { avaliacaoRepository } from "../repository/avaliacaoRepository";
import { PlanoAvaliacaoService } from "../services/PlanoAvaliacaoService";
import { contextoPontuacao, responderErroPontuacao } from "./RegraPontuacaoController";

const planoService = new PlanoAvaliacaoService(new RegraPontuacaoRepository(db), avaliacaoRepository.listarParaPlano);
async function buscarPlano(req: Request, res: Response) {
  try { return res.json(await planoService.buscar(String(req.params.turmaDisciplinaId), contextoPontuacao(req))); }
  catch (erro) { return responderErroPontuacao(res, erro, "avaliacoes.operacao"); }
}

const contexto = (req: Request) => ({ usuarioId: String((req as any).user.id), tipoUsuario: String((req as any).user.tipo_usuario) });

async function listarTodos(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.listar(contexto(req), req.query.turma_disciplina_id as string | undefined)); }
  catch (erro) { return responderErroPontuacao(res, erro, "avaliacoes.operacao"); }
}
async function listarAtribuicoes(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.listarAtribuicoes(contexto(req))); }
  catch (erro) { return responderErroPontuacao(res, erro, "avaliacoes.operacao"); }
}
async function buscarPorId(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.buscarPorId(String(req.params.id), contexto(req))); }
  catch (erro) { return responderErroPontuacao(res, erro, "avaliacoes.operacao"); }
}
async function criar(req: Request, res: Response) {
  try { return res.status(201).json(await avaliacaoService.criar(req.body, contexto(req))); }
  catch (erro) { return responderErroPontuacao(res, erro, "avaliacoes.operacao"); }
}
async function atualizar(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.atualizar(String(req.params.id), req.body, contexto(req))); }
  catch (erro) { return responderErroPontuacao(res, erro, "avaliacoes.operacao"); }
}
async function deletar(req: Request, res: Response) {
  try { await avaliacaoService.deletar(String(req.params.id), contexto(req)); return res.status(204).send(); }
  catch (erro) { return responderErroPontuacao(res, erro, "avaliacoes.operacao"); }
}

export const avaliacaoController = { listarTodos, listarAtribuicoes, buscarPorId, criar, atualizar, deletar, buscarPlano };
