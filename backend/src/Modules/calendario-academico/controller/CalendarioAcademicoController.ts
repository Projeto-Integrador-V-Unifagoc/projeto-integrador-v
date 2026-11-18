import { CalendarioAcademicoService } from "../service/CalendarioAcademicoService";

export class CalendarioAcademicoController {
  service = new CalendarioAcademicoService();
  private erro(res: any, error: any) { return res.status(error?.status ?? 500).json({ error: error?.status ? error.message : "Erro interno no calendario academico" }); }
  listar = async (req: any, res: any) => { try { res.json(await this.service.listar(req.params.periodoId)); } catch (e) { this.erro(res, e); } };
  criar = async (req: any, res: any) => { try { res.status(201).json(await this.service.criarEvento(req.params.periodoId, req.body)); } catch (e) { this.erro(res, e); } };
  atualizar = async (req: any, res: any) => { try { res.json(await this.service.atualizarEvento(req.params.id, req.body)); } catch (e) { this.erro(res, e); } };
  remover = async (req: any, res: any) => { try { await this.service.removerEvento(req.params.id); res.status(204).send(); } catch (e) { this.erro(res, e); } };
  gerar = async (req: any, res: any) => { try { res.json(await this.service.gerarAulas(req.params.periodoId, req.body)); } catch (e) { this.erro(res, e); } };
}
