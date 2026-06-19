import * as yup from "yup";

export const turmaSchema = yup.object({
  periodoLetivoId: yup.string().required("Selecione o periodo letivo"),
  cursoId: yup.string().required("Selecione o curso"),
  periodoCurricular: yup
    .number()
    .typeError("Informe o periodo curricular")
    .integer("O periodo curricular deve ser inteiro")
    .positive("O periodo curricular deve ser maior que zero")
    .required("Informe o periodo curricular"),
  descricao: yup.string().required("Informe a descricao"),
  sigla: yup.string().required("Informe a sigla"),
  capacidadeAlunos: yup
    .number()
    .typeError("Informe a capacidade de alunos")
    .integer("A capacidade deve ser inteira")
    .positive("A capacidade deve ser maior que zero")
    .required("Informe a capacidade de alunos"),
  turno: yup.string().required("Informe o turno"),
  status: yup.string().required("Informe o status"),
});
