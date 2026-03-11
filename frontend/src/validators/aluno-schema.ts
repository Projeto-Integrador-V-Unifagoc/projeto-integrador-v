import * as yup from "yup"

export const alunoSchema = yup.object({
    nome: yup.string().required("Nome é obrigatório"),
    
    cpf: yup
        .string()
        .required()
        .min(11, "CPF inválido"),
    
    dataNascimento: yup
        .string()
        .required("Data de nascimento é obrigatória"),
    
    logradouro: yup.string().required("Logradouro é obrigatório"),
    numero: yup
        .string()
        .required("Número é obrigatório"),
    bairro: yup.string().required("Bairro é obrigatório"),
    cidade: yup.string().required("Cidade é obrigatória"),
    estado: yup.string().required("Estado é obrigatório"),
    cep: yup   
        .string()
        .required("CEP é obrigatório")
        .min(8, "CEP inválido"),
    email: yup
        .string()
        .email("Email inválido")
        .required("Email é obrigatório"),
    senha: yup
        .string()
        .required("Senha é obrigatória")
        .min(6, "Senha deve ter no mínimo 6 caracteres"),
    confirmarSenha: yup
        .string()
        .oneOf([yup.ref("senha")], "As senhas devem ser iguais"),
    curso: yup.string().required("Curso é obrigatório"), 
    periodo: yup
        .string()
        .required("Período é obrigatório")    
})