//Pasta models/interface.ts para que vários outros arquivos possam acessar a classe abaixo.

export interface Avaliacao {
    id_avaliacao?: number;
    tipo_avaliacao: 'prova' | 'trabalho' | 'tpi';
    descricao_avaliacao: string;
    valor_avaliacao: number;
    data_avaliacao: number;
    data_devolucao_avaliacao: number;
}