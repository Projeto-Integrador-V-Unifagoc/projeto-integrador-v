import knex from '../../../database/connection';

export class RelatorioRepository {
  async getRelatorioAlunos() {
    return await knex('piv.aluno as a')
      .leftJoin('piv.matricula_turma_disciplina as mtd', 'mtd.aluno_id', 'a.id')
      .leftJoin('piv.avaliacao as av', 'av.matricula_turma_disciplina_id', 'mtd.id')
      .leftJoin('piv.frequencia as fr', 'fr.aluno_id', 'a.id')
      .select(
        'a.id',
        'a.nome',
        'av.nota',
        'fr.status as presenca'
      );
  }
}