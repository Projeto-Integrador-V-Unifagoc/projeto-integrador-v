import type { Avaliacao } from '../models/interface.js';
export declare const AvavaliacaoRepository: {
    buscarTodas(): Promise<Avaliacao[]>;
    criar(dados: Avaliacao): Promise<Avaliacao>;
    atualizar(id: number, dados: Partial<Avaliacao>): Promise<Avaliacao>;
    deletar(id: number): Promise<any>;
};
//# sourceMappingURL=avaliacao-repository.d.ts.map