export interface Professor {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  telefone?: string;
  especialidade?: string;
  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type AtualizarProfessor = Partial<Omit<Professor, 'id' | 'created_at' | 'updated_at'>>;
