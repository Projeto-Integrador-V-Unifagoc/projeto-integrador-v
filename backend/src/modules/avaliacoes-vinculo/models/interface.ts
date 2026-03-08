//Pasta models/interface.ts para que vários outros arquivos possam acessar a classe abaixo.

export interface Avaliacao {
    avaliacaoId?: number;
    avaliacaoVinculoId: number; //caso haja relação com outra tabela.
    avaliacaoNota: number;
    avalicaoNome: string;
}