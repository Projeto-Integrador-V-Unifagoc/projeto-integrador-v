import { formatarPontos, parsePontos, somarPontos } from "../models/Pontos";
import { validarUuidPontuacao, type ContextoRegraPontuacao, type RegraPontuacao } from "../models/RegraPontuacao";
import type { AvaliacaoDoPlano, PlanoAvaliacao } from "../models/PlanoAvaliacao";
import { snapshotAcademico, type ExecutorAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { exigirPerfilRegra } from "../gateways/RegraPontuacaoAuthGateway";
import type { RegraPontuacaoRepository } from "../repository/RegraPontuacaoRepository";

export class PlanoAvaliacaoService {
  constructor(private readonly regras: RegraPontuacaoRepository,
    private readonly listarAvaliacoes: (ofertaId: string, executor: ExecutorAcademico) => Promise<AvaliacaoDoPlano[]>) {}

  async buscar(ofertaId: string, contexto: ContextoRegraPontuacao): Promise<PlanoAvaliacao> {
    exigirPerfilRegra(contexto);
    validarUuidPontuacao(ofertaId, "turmaDisciplinaId");
    return snapshotAcademico(this.regras.banco, async (trx) => {
      const oferta = await this.regras.auth.autorizarOferta(trx, contexto, ofertaId);
      const regra = await this.regras.lerPorPar(oferta.curso_id, oferta.periodo_letivo_id, trx);
      const plano = calcularPlanoAvaliacao(ofertaId, regra, await this.listarAvaliacoes(ofertaId, trx));
      if (!oferta.periodo_ativo || ["fechado", "encerrado", "concluido", "inativo"].includes(oferta.periodo_status.toLowerCase())) {
        plano.podeCriarRegular = false;
        plano.motivosBloqueio.push("PERIODO_FECHADO");
      }
      if (oferta.status.toLowerCase() !== "ativa" || oferta.turma_status.toLowerCase() !== "ativa") {
        plano.podeCriarRegular = false;
        plano.motivosBloqueio.push("OFERTA_INATIVA");
      }
      return plano;
    });
  }
}

/** A lista recebida já foi restrita à oferta autorizada pelo repository. */
export function calcularPlanoAvaliacao(
  turmaDisciplinaId: string, regra: RegraPontuacao | null, avaliacoes: AvaliacaoDoPlano[],
): PlanoAvaliacao {
  if (!regra) return {
    turmaDisciplinaId, regraPontuacaoId: null, totalPontos: null, planoCompleto: false,
    podeCriarRegular: false, motivosBloqueio: ["REGRA_AUSENTE"], subgrupos: [],
  };
  const regulares = avaliacoes.filter((a) => a.tipo_avaliacao !== "RECUPERACAO");
  const subgrupos = regra.subgrupos.map((subgrupo) => {
    const itens = regulares.filter((a) => a.subgrupo_id === subgrupo.id);
    const distribuido = somarPontos(itens.map((a) => parsePontos(a.valor)));
    const saldo = parsePontos(subgrupo.orcamentoPontos) - distribuido;
    return {
      id: subgrupo.id, nome: subgrupo.nome, orcamentoPontos: subgrupo.orcamentoPontos,
      pontosDistribuidos: formatarPontos(distribuido), saldoPontos: formatarPontos(saldo),
      modoQuantidade: subgrupo.modoQuantidade, quantidadeFixa: subgrupo.quantidadeFixa,
      quantidadeAtual: itens.length,
      quantidadeDisponivel: subgrupo.modoQuantidade === "FIXA" ? subgrupo.quantidadeFixa! - itens.length : null,
      completo: saldo === 0n && (subgrupo.modoQuantidade === "SEM_LIMITE" || itens.length === subgrupo.quantidadeFixa),
    };
  });
  return {
    turmaDisciplinaId, regraPontuacaoId: regra.id, totalPontos: regra.totalPontos,
    planoCompleto: subgrupos.length > 0 && subgrupos.every((s) => s.completo),
    podeCriarRegular: subgrupos.some((s) => parsePontos(s.saldoPontos) > 0n && (s.quantidadeDisponivel === null || s.quantidadeDisponivel > 0)),
    motivosBloqueio: [], subgrupos,
  };
}
