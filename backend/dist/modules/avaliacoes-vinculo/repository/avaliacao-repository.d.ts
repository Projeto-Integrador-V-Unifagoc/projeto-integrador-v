import type { Avaliacao } from '../models/interface.js';
export declare const AvaliacaoRepository: {
    buscarTodas(): Promise<Avaliacao[]>;
    criar(dados: Avaliacao): Promise<Avaliacao | undefined>;
    atualizar(id: number, dados: Partial<Avaliacao>): Promise<Avaliacao | undefined>;
    deletar(id: number): Promise<number>;
};
//# sourceMappingURL=avaliacao-repository.d.ts.map