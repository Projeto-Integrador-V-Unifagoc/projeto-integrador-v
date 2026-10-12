import * as yup from "yup";
import type { RascunhoRegraPontuacao, SalvarRegraPontuacaoRequest } from "../models/regra-pontuacao-model";
import { pontosEmCentesimos, pontosParaApi } from "../utils/pontos";

// Limite físico da coluna integer do PostgreSQL, igual ao contrato do backend.
const MAX_QUANTIDADE_FIXA = 2_147_483_647;

const pontosPositivos = (rotulo: string) => yup.string().strict().required(`Informe ${rotulo}.`).test(
  "pontos-positivos", `${rotulo} deve conter pontos positivos com até duas casas decimais.`,
  (valor) => { try { return pontosEmCentesimos(valor) > 0n; } catch { return false; } },
);

export const regraPontuacaoSchema = yup.object({
  versaoEsperada: yup.number().strict().integer().positive().nullable().defined()
    .test("inteiro-seguro", "A versão deve ser um inteiro seguro.", (valor) => valor === null || Number.isSafeInteger(valor)),
  totalPontos: pontosPositivos("O total de pontos"),
  subgrupos: yup.array().required().min(1, "Adicione pelo menos um subgrupo.").of(yup.object({
    id: yup.string().optional(),
    nome: yup.string().strict().required("Informe o nome do subgrupo.")
      .test("nome-preenchido", "Informe o nome do subgrupo.", (valor) => !!valor?.trim()),
    orcamentoPontos: pontosPositivos("O orçamento"),
    modoQuantidade: yup.string().oneOf(["FIXA", "SEM_LIMITE"]).required(),
    quantidadeFixa: yup.number().strict().nullable().when("modoQuantidade", {
      is: "FIXA",
      then: (schema) => schema.required("Informe a quantidade fixa.").integer("A quantidade deve ser inteira.")
        .positive("A quantidade deve ser maior que zero.")
        .max(MAX_QUANTIDADE_FIXA, "A quantidade máxima é 2.147.483.647."),
      otherwise: (schema) => schema.test("sem-limite", "Quantidade deve ser ausente no modo sem limite.", (valor) => valor === null),
    }),
    ordem: yup.number().strict().integer().min(0).required()
      .test("inteiro-seguro", "A ordem deve ser um inteiro seguro.", Number.isSafeInteger),
  })).test("soma-exata", "A soma dos orçamentos deve ser igual ao total de pontos.", function (subgrupos) {
    try {
      return subgrupos?.reduce((soma, subgrupo) => soma + pontosEmCentesimos(subgrupo.orcamentoPontos), 0n)
        === pontosEmCentesimos(this.parent.totalPontos);
    } catch { return true; } // Os erros dos campos identificam valores inválidos.
  }),
});

/** Valida o texto original antes de convertê-lo; nenhum ponto passa por Number. */
export function prepararRegraPontuacao(rascunho: RascunhoRegraPontuacao, versaoEsperada: number | null): SalvarRegraPontuacaoRequest {
  const erros: yup.ValidationError[] = [];
  function pontos(entrada: string, campo: string): string {
    try { return pontosParaApi(entrada, { positivo: true }); }
    catch (erro) {
      erros.push(new yup.ValidationError(erro instanceof Error ? erro.message : "Informe pontos válidos.", entrada, campo));
      return entrada;
    }
  }
  const payload: SalvarRegraPontuacaoRequest = {
    versaoEsperada,
    totalPontos: pontos(rascunho.totalPontos, "totalPontos"),
    subgrupos: rascunho.subgrupos.map((subgrupo, indice) => {
      let quantidadeFixa: number | null = null;
      if (subgrupo.modoQuantidade === "FIXA") {
        const numero = Number(subgrupo.quantidadeFixa);
        if (/^[0-9]+$/.exec(subgrupo.quantidadeFixa)?.[0] !== subgrupo.quantidadeFixa || !Number.isSafeInteger(numero) || numero < 1) {
          erros.push(new yup.ValidationError("Informe uma quantidade fixa inteira e maior que zero.", subgrupo.quantidadeFixa, `subgrupos[${indice}].quantidadeFixa`));
        } else quantidadeFixa = numero;
      }
      return {
        ...(subgrupo.id ? { id: subgrupo.id } : {}),
        nome: subgrupo.nome.trim(),
        orcamentoPontos: pontos(subgrupo.orcamentoPontos, `subgrupos[${indice}].orcamentoPontos`),
        modoQuantidade: subgrupo.modoQuantidade,
        quantidadeFixa,
        ordem: indice,
      };
    }),
  };
  try { regraPontuacaoSchema.validateSync(payload, { abortEarly: false, strict: true }); }
  catch (erro) {
    if (!(erro instanceof yup.ValidationError)) throw erro;
    erros.push(...erro.inner);
  }
  if (erros.length) throw new yup.ValidationError(erros);
  return payload;
}
