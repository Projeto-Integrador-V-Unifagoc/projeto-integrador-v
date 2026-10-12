import * as yup from "yup";
import { pontosEmCentesimos } from "../utils/pontos";

function dataValida(valor: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.exec(valor)?.[0] !== valor) return false;
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function uuidPostgres(valor: string): boolean {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.exec(valor)?.[0] === valor;
}

export const avaliacaoSchema = yup.object({
  turma_disciplina_id: yup.string().test("uuid-postgres", "Selecione uma oferta válida.", (valor) => !valor || uuidPostgres(valor)).required("Selecione a turma e disciplina."),
  subgrupo_id: yup.string().test("uuid-postgres", "Selecione um subgrupo válido.", (valor) => !valor || uuidPostgres(valor)).required("Selecione o subgrupo da avaliação."),
  tipo_avaliacao: yup.string().oneOf(["REGULAR", "PROVA", "TPI", "TRABALHO"], "Tipo de avaliação inválido.").required(),
  descricao_avaliacao: yup.string().max(255, "A descrição deve ter no máximo 255 caracteres."),
  valor: yup.string().typeError("Informe o valor máximo em texto.").required("Informe o valor máximo.")
    .test("pontos", "Informe pontos válidos.", function (valor) {
      try {
        if (pontosEmCentesimos(valor) === 0n) return this.createError({ message: "Os pontos devem ser maiores que zero." });
        return true;
      } catch (erro) {
        return this.createError({ message: erro instanceof Error ? erro.message : "Informe pontos válidos." });
      }
    }),
  data_lancamento: yup.string().required("Informe a data de lançamento.")
    .test("calendario", "Informe uma data de lançamento válida.", (valor) => !valor || dataValida(valor)),
  data_devolucao: yup.string().nullable()
    .test("calendario", "Informe uma data de devolução válida.", (valor) => !valor || dataValida(valor))
    .test("devolucao-posterior", "A data de devolução não pode ser anterior ao lançamento.", function (valor) {
      return !valor || !this.parent.data_lancamento || valor >= this.parent.data_lancamento;
    }),
}).strict();
