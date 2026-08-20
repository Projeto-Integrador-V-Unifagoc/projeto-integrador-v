export interface CriarProfessorDTO {
  nome: string;
  cpf: string;
  data_nascimento: string | Date;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade_id: string;
  estado: string;
  cep: string;
  curso_id: string;
  faculdade_id?: string;
}

export interface AtualizarProfessor extends Partial<CriarProfessorDTO> {}

export interface FiltroProfessor {
  ativo?: boolean;
}

export interface ProfessorOpcao {
  id: string;
  nome: string;
  curso_id: string;
  curso_nome: string;
}
