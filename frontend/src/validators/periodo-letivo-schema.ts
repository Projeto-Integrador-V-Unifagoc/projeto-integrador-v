import * as yup from "yup";

export const periodoLetivoSchema = yup.object({
  codigo: yup.string().required("Informe o codigo do periodo letivo"),
  ano: yup
    .number()
    .typeError("Informe o ano")
    .integer("O ano deve ser inteiro")
    .required("Informe o ano"),
  semestre: yup
    .number()
    .typeError("Informe o semestre")
    .oneOf([1, 2], "O semestre deve ser 1 ou 2")
    .required("Informe o semestre"),
  dataInicio: yup.string().required("Informe a data de inicio"),
  dataFim: yup
    .string()
    .required("Informe a data de fim")
    .test("data-fim", "A data fim deve ser maior ou igual a data de inicio", function validate(value) {
      const { dataInicio } = this.parent;

      if (!value || !dataInicio) {
        return true;
      }

      return new Date(value) >= new Date(dataInicio);
    }),
  status: yup.string().required("Informe o status"),
});
