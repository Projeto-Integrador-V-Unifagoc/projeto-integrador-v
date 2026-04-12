export interface Cidade {
  id?: string;
  nome: string;
  uf: string;
}

export interface Usuario {
  id?: string;
  email: string;
  senha: string;
  created_at?: Date;
  updated_at?: Date;
  tipo_usuario: string;
}

export interface Pessoa {
  id?: string;
  nome: string;
  data_nascimento: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade_id: string;
  estado: string;
  cep: string;
  cpf: string;
}

export interface Professor {
  id?: string;
  usuario_id: string;
  pessoa_id: string;
  curso_id: string;
  faculdade_id: string;
}
