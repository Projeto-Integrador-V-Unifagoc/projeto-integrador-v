/** `aluno.matricula` é um serial (integer do Postgres): de 1 até 2.147.483.647. */
const MAIOR_MATRICULA = 2_147_483_647;

/**
 * Normaliza a matrícula antes de ela chegar ao banco: só dígitos, sem zeros à esquerda e dentro do limite
 * do integer. Texto fora disso faria o Postgres lançar erro de sintaxe ou de faixa.
 */
export function validarMatricula(valor: unknown): string {
    const texto = String(valor ?? "").trim();
    const semZeros = /^\d+$/.test(texto) ? texto.replace(/^0+/, "") : "";
    if (!semZeros || semZeros.length > 10 || Number(semZeros) > MAIOR_MATRICULA) {
        throw Object.assign(new Error("Matrícula inválida. Informe só os números da matrícula."), { status: 400 });
    }
    return semZeros;
}
