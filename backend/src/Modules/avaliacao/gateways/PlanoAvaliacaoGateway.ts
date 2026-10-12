import type { ExecutorAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import type { OfertaResultadoAcademico } from "../../notas/gateways/EstruturaAcademicaGateway";
import type { RegraPontuacao } from "../models/RegraPontuacao";
import type { PlanoAvaliacao } from "../models/PlanoAvaliacao";
import { calcularPlanoAvaliacao } from "../services/PlanoAvaliacaoService";
import { formatarPontos, parsePontos } from "../models/Pontos";
import type { TipoAvaliacao } from "../models/avaliacaoModels";

export interface AvaliacaoResultadoLote {
  id: string;
  turma_disciplina_id: string;
  tipo_avaliacao: TipoAvaliacao;
  subgrupo_id: string | null;
  descricao_avaliacao?: string | null;
  valor: string;
  [campo: string]: any;
}
export interface PlanoResultadoLote {
  plano: PlanoAvaliacao;
  avaliacoes: Array<AvaliacaoResultadoLote & { tipo: TipoAvaliacao; descricao: string | null }>;
}
type ListarAvaliacoes = (ids: string[], executor: ExecutorAcademico) => Promise<AvaliacaoResultadoLote[]>;
const pontos = (valor: string) => formatarPontos(parsePontos(valor));

/** Recebe somente ofertas autorizadas e resolve referência preservada antes do par aplicável. */
export class PlanoAvaliacaoGateway {
  constructor(private readonly listarAvaliacoes: ListarAvaliacoes) {}

  async carregar(ofertas: OfertaResultadoAcademico[], executor: ExecutorAcademico): Promise<Map<string, PlanoResultadoLote>> {
    if (ofertas.length === 0) return new Map();
    const idsPreservados = ofertas.flatMap((o) => o.regra_pontuacao_id ? [o.regra_pontuacao_id] : []);
    const regras = await executor("piv.regra_pontuacao").where((q) => {
      q.whereIn("id", idsPreservados);
      for (const oferta of ofertas) q.orWhere({ curso_id: oferta.curso_id, periodo_letivo_id: oferta.periodo_letivo_id });
    }).select("*");
    const grupos = regras.length ? await executor("piv.subgrupo_avaliacao")
      .whereIn("regra_pontuacao_id", regras.map((r) => r.id)).orderBy(["ordem", "id"]) : [];
    const avaliacoes = await this.listarAvaliacoes(ofertas.map((o) => o.id), executor);
    const permitidas = new Set(ofertas.map((o) => o.id));
    if (avaliacoes.some((a) => !permitidas.has(a.turma_disciplina_id))) throw new Error("Plano acadêmico incompatível.");
    return new Map(ofertas.map((oferta) => {
      const linha = oferta.regra_pontuacao_id ? regras.find((r) => r.id === oferta.regra_pontuacao_id) :
        regras.find((r) => r.curso_id === oferta.curso_id && r.periodo_letivo_id === oferta.periodo_letivo_id);
      if ((oferta.regra_pontuacao_id && !linha) || (linha && (linha.curso_id !== oferta.curso_id ||
        linha.periodo_letivo_id !== oferta.periodo_letivo_id))) throw new Error("Referência de pontuação incompatível.");
      const regra: RegraPontuacao | null = linha ? { id: linha.id, cursoId: linha.curso_id,
        periodoLetivoId: linha.periodo_letivo_id, totalPontos: pontos(linha.total_pontos), origem: linha.origem,
        versao: linha.versao, estado: linha.usada_em ? "PRESERVADA" : "DISPONIVEL",
        usadaEm: linha.usada_em ? new Date(linha.usada_em).toISOString() : null,
        criadaEm: new Date(linha.created_at).toISOString(), atualizadaEm: new Date(linha.updated_at).toISOString(),
        criadaPorUsuarioId: linha.criada_por_usuario_id, atualizadaPorUsuarioId: linha.atualizada_por_usuario_id,
        subgrupos: grupos.filter((g) => g.regra_pontuacao_id === linha.id).map((g) => ({
          id: g.id, nome: g.nome, orcamentoPontos: pontos(g.orcamento_pontos), modoQuantidade: g.modo_quantidade,
          quantidadeFixa: g.quantidade_fixa, ordem: g.ordem,
        })) } : null;
      const itens = avaliacoes.filter((a) => a.turma_disciplina_id === oferta.id);
      const plano = calcularPlanoAvaliacao(oferta.id, regra, itens);
      if (oferta.periodo_ativo === false || ["fechado", "encerrado", "concluido", "inativo"].includes(String(oferta.periodo_status).toLowerCase())) {
        plano.podeCriarRegular = false; plano.motivosBloqueio.push("PERIODO_FECHADO");
      }
      if (!["ativa", "ativo", "regular", "matriculado"].includes(String(oferta.status).toLowerCase()) ||
        String(oferta.turma_status).toLowerCase() !== "ativa") {
        plano.podeCriarRegular = false; plano.motivosBloqueio.push("OFERTA_INATIVA");
      }
      return [oferta.id, { plano, avaliacoes: itens.map((a) => ({ ...a, valor: pontos(a.valor),
        tipo: a.tipo_avaliacao, descricao: a.descricao_avaliacao ?? null })) }];
    }));
  }
}
