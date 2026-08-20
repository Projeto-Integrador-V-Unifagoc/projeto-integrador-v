import * as yup from "yup";

export const cursoDisciplinaSchema = yup.object({
  disciplinaId: yup.string().required("Selecione a disciplina"),
  periodoIdeal: yup
    .number()
    .typeError("Informe o periodo ideal")
    .integer("O periodo ideal deve ser inteiro")
    .min(1, "O periodo ideal deve estar entre 1 e 12")
    .max(12, "O periodo ideal deve estar entre 1 e 12")
    .required("Informe o periodo ideal"),
  cargaHoraria: yup
    .number()
    .typeError("Informe a carga horaria")
    .integer("A carga horaria deve ser inteira")
    .positive("A carga horaria deve ser maior que zero")
    .required("Informe a carga horaria"),
  obrigatoria: yup.boolean().required(),
});
