import { AvaliacaoRepository } from '../repository/avaliacao-repository.js';
const repository = new AvaliacaoRepository();
export const getAvaliacoes = async (req, res) => {
    try {
        const dados = await repository.buscarTodas();
        res.json(dados);
    }
    catch (error) {
        res.status(500).json({ erro: "Erro ao buscar dados" });
    }
};
//# sourceMappingURL=avaliacao-controller.js.map