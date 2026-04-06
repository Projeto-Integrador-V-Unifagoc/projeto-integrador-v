export interface User {
  id: string;
  email: string;
  senha: string;
  tipo_usuario: string;
  created_at: Date;
  updated_at: Date;
}

export type CreateUserInput = Omit<User, "id" | "created_at" | "updated_at">;

export type UpdateUserInput = Partial<CreateUserInput>;
