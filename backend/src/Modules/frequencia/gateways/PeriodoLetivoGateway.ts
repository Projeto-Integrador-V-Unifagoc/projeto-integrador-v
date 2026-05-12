export class PeriodoLetivoGateway {
  validarData(data: Date) {
    const anoAtual = new Date().getFullYear();
    const inicio = new Date(anoAtual, 0, 1);
    const fim = new Date(anoAtual, 11, 31, 23, 59, 59, 999);

    return data >= inicio && data <= fim;
  }

  obterDescricao() {
    return `${new Date().getFullYear()}/1-2`;
  }
}
