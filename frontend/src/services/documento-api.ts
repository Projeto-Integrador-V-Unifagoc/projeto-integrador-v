import { api } from "../lib/axios";

export interface DocumentoAluno {
  id: string;
  aluno_id: string;
  tipo_documento: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  status?: string | null;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const documentoApi = {
  async listarPorAluno(alunoId: string): Promise<DocumentoAluno[]> {
    const response = await api.get<DocumentoAluno[]>(`/documentos/aluno/${alunoId}`);
    return response.data;
  },
};
