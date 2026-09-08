import * as yup from "yup";

export const turmaDisciplinaSchema = yup.object({
  cursoDisciplinaId: yup.string().required("Selecione a disciplina da matriz"),
  professorId: yup.string().required("Selecione o professor"),
  status: yup
    .string()
    .oneOf(["planejada", "ativa", "concluida", "cancelada", "encerrada"], "Informe um status valido")
    .required("Informe o status"),
});
