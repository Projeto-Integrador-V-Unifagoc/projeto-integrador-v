import type { Request, Response } from "express";
import { avaliacaoService } from "../services/avaliacaoServices.js";
import { AvaliacaoError } from "../errors/avaliacaoErrors.js";

const contexto = (req: Request) => ({ usuarioId: String((req as any).user.id), tipoUsuario: String((req as any).user.tipo_usuario) });

function responderErro(res: Response, erro: unknown, operacao: string) {
  if (erro instanceof AvaliacaoError) return res.status(erro.status).json({ mensagem: erro.message });
  console.error(`Erro ao ${operacao} avaliacao`, erro);
  return res.status(500).json({ mensagem: "Erro interno do servidor." });
}

async function listarTodos(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.listar(contexto(req), req.query.turma_disciplina_id as string | undefined)); }
  catch (erro) { return responderErro(res, erro, "listar"); }
}
async function listarAtribuicoes(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.listarAtribuicoes(contexto(req))); }
  catch (erro) { return responderErro(res, erro, "listar atribuicoes de"); }
}
async function buscarPorId(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.buscarPorId(String(req.params.id), contexto(req))); }
  catch (erro) { return responderErro(res, erro, "buscar"); }
}
async function criar(req: Request, res: Response) {
  try { return res.status(201).json(await avaliacaoService.criar(req.body, contexto(req))); }
  catch (erro) { return responderErro(res, erro, "criar"); }
}
async function atualizar(req: Request, res: Response) {
  try { return res.json(await avaliacaoService.atualizar(String(req.params.id), req.body, contexto(req))); }
  catch (erro) { return responderErro(res, erro, "atualizar"); }
}
async function deletar(req: Request, res: Response) {
  try { await avaliacaoService.deletar(String(req.params.id), contexto(req)); return res.status(204).send(); }
  catch (erro) { return responderErro(res, erro, "excluir"); }
}

export const avaliacaoController = { listarTodos, listarAtribuicoes, buscarPorId, criar, atualizar, deletar };
