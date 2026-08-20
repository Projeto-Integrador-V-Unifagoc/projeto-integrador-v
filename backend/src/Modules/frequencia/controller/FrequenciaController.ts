import type { Request, Response } from "express";
import { FrequenciaError } from "../errors/FrequenciaError";
import { FrequenciaService } from "../service/FrequenciaService";

export class FrequenciaController {
  constructor(private service = new FrequenciaService()) {}
  private erro(res: Response, error: unknown) {
    if (error instanceof FrequenciaError) return res.status(error.status).json({ codigo: error.codigo, mensagem: error.message });
    console.error("Erro no módulo de frequência", error);
    return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem: "Erro interno do servidor." });
  }
  listarOpcoes = async (req: Request, res: Response) => { try { return res.json(await this.service.listarOpcoes(req)); } catch (e) { return this.erro(res, e); } };
  obterChamada = async (req: Request, res: Response) => { try { return res.json(await this.service.obterChamada(String(req.query.turmaDisciplinaId || ""), String(req.query.data || ""), req)); } catch (e) { return this.erro(res, e); } };
  salvarChamada = async (req: Request, res: Response) => { try { return res.status(200).json(await this.service.salvarChamada(req.body, req)); } catch (e) { return this.erro(res, e); } };
  consultarAluno = async (req: Request, res: Response) => { try { return res.json(await this.service.consultarAluno(String(req.params.alunoId), req)); } catch (e) { return this.erro(res, e); } };
  minhaFrequencia = async (req: Request, res: Response) => { try { return res.json(await this.service.minhaFrequencia(req)); } catch (e) { return this.erro(res, e); } };
  consultarTurma = async (req: Request, res: Response) => { try { return res.json(await this.service.consultarTurma(String(req.params.turmaId), req, req.query as any)); } catch (e) { return this.erro(res, e); } };
  justificar = async (req: Request, res: Response) => { try { return res.json(await this.service.registrarJustificativa(String(req.params.id), req.body, req)); } catch (e) { return this.erro(res, e); } };
  relatorio = async (req: Request, res: Response) => { try { return res.json(await this.service.gerarRelatorio(req.query, req)); } catch (e) { return this.erro(res, e); } };
}
