import * as yup from "yup";

export const cursoSchema = yup.object({
  codigo: yup.string().required("Informe o código do curso"),
  nome: yup.string().required("Informe o nome do curso"),
  departamentoId: yup.string().required("Selecione um departamento"),
})
