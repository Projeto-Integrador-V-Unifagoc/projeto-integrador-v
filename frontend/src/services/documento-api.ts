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

export interface InscritoComDocumentos {
  aluno_id: string;
  aluno_nome: string;
  aluno_cpf: string;
  aluno_matricula: number;
  curso_nome: string | null;
  documentos_total: number;
  documentos_pendentes: number;
  documentos_aprovados: number;
  documentos_reprovados: number;
  ultimo_envio: string | null;
  tem_matricula: boolean;
}

export type StatusValidacao = "APROVADO" | "REPROVADO";

export const documentoApi = {
  async listarPorAluno(alunoId: string): Promise<DocumentoAluno[]> {
    const response = await api.get<DocumentoAluno[]>(`/documentos/aluno/${alunoId}`);
    return response.data;
  },

  async listarInscritos(): Promise<InscritoComDocumentos[]> {
    const response = await api.get<InscritoComDocumentos[]>("/documentos/inscritos");
    return response.data;
  },

  async enviar(alunoId: string, tipoDocumento: string, arquivo: File): Promise<DocumentoAluno> {
    const form = new FormData();
    form.append("aluno_id", alunoId);
    form.append("tipo_documento", tipoDocumento);
    form.append("arquivo", arquivo);
    const response = await api.post<DocumentoAluno>("/documentos", form);
    return response.data;
  },

  async validar(id: string, status: StatusValidacao, observacao?: string): Promise<DocumentoAluno> {
    const response = await api.patch<DocumentoAluno>(`/documentos/${id}/validar`, { status, observacao });
    return response.data;
  },

  async abrirArquivo(id: string): Promise<string> {
    const response = await api.get(`/documentos/${id}/arquivo`, { responseType: "blob" });
    return URL.createObjectURL(response.data as Blob);
  },
};
