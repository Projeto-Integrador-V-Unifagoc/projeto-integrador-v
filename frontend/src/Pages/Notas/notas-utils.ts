export type Aviso = { tipo: "success" | "error" | "info" | "warning"; texto: string };

// Perfil do usuário logado em minúsculas; usado para diferenciar secretaria, professor e aluno.
export const perfilLocal = () => {
  try {
    return String(JSON.parse(localStorage.getItem("@UniEduca:user") || "{}").tipo_usuario || "").toLowerCase();
  } catch {
    return "";
  }
};

export const mensagemErro = (erro: unknown) => {
  const e = erro as { response?: { data?: { mensagem?: string } }; message?: string };
  return e.response?.data?.mensagem || e.message || "Não foi possível concluir a operação.";
};

// Médias e percentuais sempre em pt-BR, com uma casa decimal e sufixo de porcentagem.
export const formatarMedia = (valor: number | null | undefined) =>
  valor == null ? "—" : `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor)}%`;

// Valor numérico de uma nota (pontos) em pt-BR com duas casas decimais.
export const formatarNotaValor = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

// Texto da nota para leitura: diferencia explicitamente "Não lançada" de zero.
export const formatarNota = (valor: number | null | undefined) => (valor == null ? "Não lançada" : formatarNotaValor(valor));
