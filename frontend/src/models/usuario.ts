
export interface Usuario {
  nome: string;
  email: string;
  senha?: string;
  tipo_usuario: string; // Mudamos de 'perfil' para 'tipo_usuario'
}