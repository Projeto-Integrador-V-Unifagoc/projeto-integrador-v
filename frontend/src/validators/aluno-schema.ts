import * as yup from "yup"

export const alunoSchema = yup.object({
    nome: yup.string().required("Nome Ã© obrigatÃ³rio"),
    
    cpf: yup
        .string()
        .required()
        .min(11, "CPF invÃ¡lido"),
    
    dataNascimento: yup
        .string()
        .required("Data de nascimento Ã© obrigatÃ³ria"),
    
    logradouro: yup.string().required("Logradouro Ã© obrigatÃ³rio"),
    numero: yup
        .string()
        .required("NÃºmero Ã© obrigatÃ³rio"),
    bairro: yup.string().required("Bairro Ã© obrigatÃ³rio"),
    cidadeIbge: yup.string().required("Cidade Ã© obrigatÃ³ria"),
    estado: yup.string().required("Estado Ã© obrigatÃ³rio"),
    cep: yup
        .string()
        .required("CEP Ã© obrigatÃ³rio")
        .min(8, "CEP invÃ¡lido"),
    curso: yup.string(),
    periodo: yup
        .string()
        .required("PerÃ­odo Ã© obrigatÃ³rio")
})
