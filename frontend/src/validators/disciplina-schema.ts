import * as yup from "yup";

export const disciplinaSchema = yup.object({
  codigo: yup.string().required("Informe o codigo da disciplina"),
  nome: yup.string().required("Informe o nome da disciplina"),
  cargaHoraria: yup
    .number()
    .typeError("Informe a carga horaria")
    .integer("A carga horaria deve ser inteira")
    .positive("A carga horaria deve ser maior que zero")
    .required("Informe a carga horaria"),
  preRequisito: yup.string().optional(),
});
