import * as yup from "yup";

export const disciplinaSchema = yup.object({
  codigo: yup.string().required("Informe o código da disciplina"),
  nome: yup.string().required("Informe o nome da disciplina"),
  cursoId: yup.string().required("Selecione um curso"),
  cargaHoraria: yup
    .number()
    .typeError("Informe a carga horária")
    .integer("A carga horária deve ser inteira")
    .positive("A carga horária deve ser maior que zero")
    .required("Informe a carga horária"),
  preRequisito: yup.string().optional(),
})
