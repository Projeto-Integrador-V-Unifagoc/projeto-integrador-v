import * as yup from "yup";

export const cursoSchema = yup.object({
  codigo: yup.string().required("Informe o código do curso"),
  nome: yup.string().required("Informe o nome do curso"),
  departamentoId: yup.string().required("Selecione um departamento"),
  descricao: yup.string().trim().required("Informe a descrição acadêmica"),
  grauAcademico: yup.string().required("Selecione o grau acadêmico"),
  modalidade: yup.string().required("Selecione a modalidade"),
  duracaoPeriodos: yup.number().typeError("Informe a duração").integer("Use um número inteiro").min(1, "A duração deve ser positiva").max(30, "Máximo de 30 períodos").required("Informe a duração"),
  cargaHorariaMinima: yup.number().typeError("Informe a carga mínima").integer("Use um número inteiro").positive("A carga deve ser positiva").required("Informe a carga mínima"),
  situacaoAcademica: yup.string().required("Selecione a situação"),
  atoRegulatorio: yup.string().max(160, "Use no máximo 160 caracteres").optional(),
  observacoesRegulatorias: yup.string().optional(),
})
