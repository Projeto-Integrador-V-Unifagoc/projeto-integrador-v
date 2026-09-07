export function cpfValido(valor?: string): boolean {
  const cpf = String(valor || "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (tamanho: number) => {
    let soma = 0;
    for (let indice = 0; indice < tamanho - 1; indice += 1) {
      soma += Number(cpf[indice]) * (tamanho - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(10) === Number(cpf[9]) && calcularDigito(11) === Number(cpf[10]);
}
