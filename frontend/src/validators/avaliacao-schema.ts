import * as yup from "yup";

export const avaliacaoSchema = yup.object({
  turma_disciplina_id: yup.string().required("Selecione a turma e disciplina antes de adicionar a avaliação."),
  tipo_avaliacao: yup.string().oneOf(["PROVA", "TPI", "TRABALHO"], "Tipo de avaliação inválido.").required("Selecione o tipo."),
  descricao_avaliacao: yup.string().trim().max(255, "A descrição deve ter no máximo 255 caracteres."),
  valor: yup.number().transform((valor, original) => original === "" ? Number.NaN : valor)
    .typeError("Informe o valor da avaliação.").positive("O valor deve ser maior que zero.").required("Informe o valor da avaliação."),
  data_lancamento: yup.string().required("Informe a data de lançamento."),
  data_devolucao: yup.string().test("devolucao-posterior", "A data de devolução não pode ser anterior ao lançamento.", function (valor) {
    return !valor || !this.parent.data_lancamento || valor >= this.parent.data_lancamento;
  }),
});
