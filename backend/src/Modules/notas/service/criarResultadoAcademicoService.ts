import { ResultadoAcademicoService } from "./ResultadoAcademicoService";
import { NotaRepository } from "../repository/NotaRepository";
import { AuthContextGateway } from "../gateways/AuthContextGateway";
import { EstruturaAcademicaGateway } from "../gateways/EstruturaAcademicaGateway";
import { PlanoAvaliacaoGateway } from "../../avaliacao/gateways/PlanoAvaliacaoGateway";
import { avaliacaoRepository } from "../../avaliacao/repository/avaliacaoRepository";
import { FrequenciaConsolidadaGateway } from "../../frequencia/gateways/FrequenciaConsolidadaGateway";
import { FrequenciaRepository } from "../../frequencia/repository/FrequenciaRepository";

/** Composição do runtime; gateways puros/injetáveis não importam o banco global. */
export function criarResultadoAcademicoService(repository = new NotaRepository()) {
  return new ResultadoAcademicoService({ banco: repository.banco,
    auth: new AuthContextGateway(repository), estrutura: new EstruturaAcademicaGateway(),
    planos: new PlanoAvaliacaoGateway((ids, executor) => avaliacaoRepository.listarEmLote(ids, executor)),
    notas: repository, frequencia: new FrequenciaConsolidadaGateway(new FrequenciaRepository()),
  });
}
