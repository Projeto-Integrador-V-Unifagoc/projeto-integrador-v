import * as yup from "yup";

import { cpfValido } from "../utils/cpf";

export const professorSchema = yup.object({
  nome: yup.string().trim().min(3, "Informe um nome com ao menos 3 caracteres").required("Campo obrigatório"),
  cpf: yup.string().required("Campo obrigatório").test("cpf", "Informe um CPF válido", cpfValido),
  dataNascimento: yup.string().required("Campo obrigatório").test("data", "Informe uma data de nascimento válida", (valor) => {
    if (!valor) return false;
    const data = new Date(`${valor}T00:00:00`);
    return !Number.isNaN(data.getTime()) && data <= new Date();
  }),
  curso_id: yup.string().required("Campo obrigatório"),
  faculdade_id: yup.string().required("Selecione um curso vinculado a uma faculdade"),
  cidade_id: yup.string().required("Campo obrigatório"),
  uf: yup.string().matches(/^[A-Z]{2}$/, "Informe uma UF válida").required("Campo obrigatório"),
  logradouro: yup.string().trim().required("Campo obrigatório"),
  bairro: yup.string().trim().required("Campo obrigatório"),
  numero: yup.string().trim().required("Campo obrigatório"),
  cep: yup.string().required("Campo obrigatório").test("cep", "CEP deve ter 8 dígitos", (valor) => /^\d{8}$/.test(String(valor || "").replace(/\D/g, ""))),
});
