import { RelatorioRepository } from '../repository/RelatorioRepository';

export class RelatorioService {
  async execute() {
    const repository = new RelatorioRepository();
    return await repository.getRelatorioAlunos();
  }
}