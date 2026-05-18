import * as yup from "yup";

export const cursoDisciplinaSchema = yup.object({
  disciplinaId: yup.string().required("Selecione a disciplina"),
  periodoIdeal: yup
    .number()
    .typeError("Informe o periodo ideal")
    .integer("O periodo ideal deve ser inteiro")
    .positive("O periodo ideal deve ser maior que zero")
    .required("Informe o periodo ideal"),
  cargaHoraria: yup
    .number()
    .typeError("Informe a carga horaria")
    .integer("A carga horaria deve ser inteira")
    .positive("A carga horaria deve ser maior que zero")
    .required("Informe a carga horaria"),
  obrigatoria: yup.boolean().required(),
});
