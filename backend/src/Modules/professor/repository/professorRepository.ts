import { db } from '../../../database/connection.js';
import type { AtualizarProfessor, CriarProfessorDTO, DisciplinaDoProfessor, FiltroProfessor } from '../models/professorModels.js';

const baseQuery = () => db('piv.professor')
  .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
  .leftJoin('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
  .leftJoin('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id');

const camposCompletos = [
  'piv.professor.id', 'piv.professor.usuario_id', 'piv.professor.pessoa_id',
  'piv.professor.ativo', 'piv.pessoa.nome', 'piv.pessoa.cpf',
  'piv.pessoa.data_nascimento', 'piv.pessoa.logradouro', 'piv.pessoa.numero',
  'piv.pessoa.bairro', 'piv.pessoa.cidade_id', 'piv.pessoa.estado', 'piv.pessoa.cep',
  'piv.professor.faculdade_id', 'piv.faculdade.nome as faculdade',
];

// Cada vínculo é uma disciplina dentro de um curso (linha da matriz curricular).
// O `id` devolvido é o da `curso_disciplina`, que é o que o cadastro envia.
async function anexarDisciplinas<T extends { id: string }>(professores: T[]) {
  const ids = professores.map((professor) => professor.id);
  const vinculos = ids.length
    ? await db('piv.professor_disciplina')
        .join('piv.curso_disciplina', 'piv.professor_disciplina.curso_disciplina_id', 'piv.curso_disciplina.id')
        .join('piv.disciplinas', 'piv.curso_disciplina.disciplina_id', 'piv.disciplinas.id')
        .join('piv.curso', 'piv.curso_disciplina.curso_id', 'piv.curso.id')
        .whereIn('piv.professor_disciplina.professor_id', ids)
        .select(
          'piv.professor_disciplina.professor_id',
          'piv.curso_disciplina.id',
          'piv.disciplinas.id as disciplina_id',
          'piv.disciplinas.nome',
          'piv.curso.id as curso_id',
          'piv.curso.nome as curso_nome',
        )
        .orderBy(['piv.curso.nome', 'piv.disciplinas.nome'])
    : [];
  const porProfessor = new Map<string, DisciplinaDoProfessor[]>();
  for (const vinculo of vinculos) {
    const lista = porProfessor.get(vinculo.professor_id) ?? [];
    lista.push({
      id: vinculo.id,
      disciplinaId: vinculo.disciplina_id,
      nome: vinculo.nome,
      cursoId: vinculo.curso_id,
      cursoNome: vinculo.curso_nome,
    });
    porProfessor.set(vinculo.professor_id, lista);
  }
  return professores.map((professor) => ({ ...professor, disciplinas: porProfessor.get(professor.id) ?? [] }));
}

export const professorRepository = {
  async listarTodos(filtro: FiltroProfessor = {}) {
    const query = baseQuery().select(camposCompletos).orderBy('piv.pessoa.nome');
    if (filtro.ativo !== undefined) query.where('piv.professor.ativo', filtro.ativo);
    return anexarDisciplinas(await query);
  },

  async listarOpcoes() {
    const professores = await baseQuery()
      .where('piv.professor.ativo', true)
      .select('piv.professor.id', 'piv.pessoa.nome')
      .orderBy('piv.pessoa.nome');
    return anexarDisciplinas(professores);
  },

  async buscarPorId(id: string) {
    const professor = await baseQuery().select(camposCompletos).where('piv.professor.id', id).first();
    if (!professor) return professor;
    const [comDisciplinas] = await anexarDisciplinas([professor]);
    return comDisciplinas;
  },

  async buscarPorCpf(cpf: string) {
    return db('piv.pessoa').join('piv.professor', 'piv.professor.pessoa_id', 'piv.pessoa.id')
      .select('piv.professor.id').where('piv.pessoa.cpf', cpf).first();
  },

  // Linhas da matriz ativas (associação e disciplina) entre os ids informados.
  async buscarCursoDisciplinasAtivasPorIds(ids: string[]) {
    if (!ids.length) return [];
    return db('piv.curso_disciplina')
      .join('piv.disciplinas', 'piv.curso_disciplina.disciplina_id', 'piv.disciplinas.id')
      .whereIn('piv.curso_disciplina.id', ids)
      .andWhere('piv.curso_disciplina.ativo', true)
      .andWhere('piv.disciplinas.ativo', true)
      .select('piv.curso_disciplina.id', 'piv.disciplinas.nome');
  },

  async buscarFaculdadePorId(id: string) {
    return db('piv.faculdade').where({ id }).select('id').first();
  },

  async buscarCidadePorIbge(ibge: string) {
    return db('piv.cidade').select('ibge', 'uf').where({ ibge }).first();
  },

  async criar(dados: CriarProfessorDTO) {
    return db.transaction(async (trx) => {
      const [pessoa] = await trx('piv.pessoa').insert({
        nome: dados.nome, cpf: dados.cpf, data_nascimento: dados.data_nascimento,
        logradouro: dados.logradouro, numero: dados.numero, bairro: dados.bairro,
        cidade_id: dados.cidade_id, estado: dados.estado, cep: dados.cep,
      }).returning('*');
      const [professor] = await trx('piv.professor').insert({
        usuario_id: null, pessoa_id: pessoa.id,
        faculdade_id: dados.faculdade_id ?? null, ativo: true,
      }).returning('*');
      await trx('piv.professor_disciplina').insert(
        dados.cursoDisciplinaIds.map((curso_disciplina_id) => ({ professor_id: professor.id, curso_disciplina_id })),
      );
      return { ...professor, nome: pessoa.nome, cpf: pessoa.cpf };
    });
  },

  async atualizar(id: string, dados: AtualizarProfessor) {
    return db.transaction(async (trx) => {
      const professor = await trx('piv.professor').where({ id }).first();
      if (!professor) return null;
      const pessoa: Record<string, unknown> = {};
      for (const campo of ['nome', 'cpf', 'data_nascimento', 'logradouro', 'numero', 'bairro', 'cidade_id', 'estado', 'cep'] as const) {
        if (dados[campo] !== undefined) pessoa[campo] = dados[campo];
      }
      if (Object.keys(pessoa).length) await trx('piv.pessoa').where({ id: professor.pessoa_id }).update(pessoa);
      if (dados.faculdade_id !== undefined) {
        await trx('piv.professor').where({ id }).update({ faculdade_id: dados.faculdade_id, updated_at: trx.fn.now() });
      }
      if (dados.cursoDisciplinaIds !== undefined) {
        await trx('piv.professor_disciplina').where({ professor_id: id }).del();
        if (dados.cursoDisciplinaIds.length) {
          await trx('piv.professor_disciplina').insert(
            dados.cursoDisciplinaIds.map((curso_disciplina_id) => ({ professor_id: id, curso_disciplina_id })),
          );
        }
      }
      if (dados.nome !== undefined && professor.usuario_id) {
        await trx('piv.usuario').where({ id: professor.usuario_id }).update({ nome: dados.nome, updated_at: trx.fn.now() });
      }
      const atualizado = await trx('piv.professor')
        .join('piv.pessoa', 'piv.professor.pessoa_id', 'piv.pessoa.id')
        .leftJoin('piv.faculdade', 'piv.professor.faculdade_id', 'piv.faculdade.id')
        .leftJoin('piv.usuario', 'piv.professor.usuario_id', 'piv.usuario.id')
        .select(camposCompletos).where('piv.professor.id', id).first();
      if (!atualizado) return atualizado;
      const [comDisciplinas] = await anexarDisciplinas([atualizado]);
      return comDisciplinas;
    });
  },

  async definirAtivo(id: string, ativo: boolean) {
    const [professor] = await db('piv.professor').where({ id }).update({ ativo, updated_at: db.fn.now() }).returning('*');
    return professor ?? null;
  },

  async buscarProfessorAtivoPorId(id: string) {
    return db('piv.professor').select('id', 'ativo').where({ id, ativo: true }).first();
  },

  // Acrescenta uma disciplina sem mexer nas demais; repetir o vinculo nao gera erro.
  async vincularDisciplina(professorId: string, cursoDisciplinaId: string) {
    await db('piv.professor_disciplina')
      .insert({ professor_id: professorId, curso_disciplina_id: cursoDisciplinaId })
      .onConflict(['professor_id', 'curso_disciplina_id'])
      .ignore();
  },

  // Ofertas ativas ou planejadas em que o professor responde por alguma das linhas da matriz informadas.
  async listarOfertasEmAndamentoPorDisciplinas(professorId: string, cursoDisciplinaIds: string[]) {
    if (!cursoDisciplinaIds.length) return [];
    return db('piv.turma_disciplina')
      .join('piv.curso_disciplina', 'piv.turma_disciplina.curso_disciplina_id', 'piv.curso_disciplina.id')
      .join('piv.disciplinas', 'piv.curso_disciplina.disciplina_id', 'piv.disciplinas.id')
      .join('piv.turma', 'piv.turma_disciplina.turma_id', 'piv.turma.id')
      .where('piv.turma_disciplina.professor_id', professorId)
      .whereIn('piv.turma_disciplina.curso_disciplina_id', cursoDisciplinaIds)
      .whereIn('piv.turma_disciplina.status', ['ativa', 'planejada'])
      .select('piv.disciplinas.nome as disciplina', 'piv.turma.sigla as turma')
      .orderBy(['piv.disciplinas.nome', 'piv.turma.sigla']);
  },

  async professorLecionaDisciplina(professorId: string, cursoDisciplinaId: string) {
    const vinculo = await db('piv.professor_disciplina')
      .where({ professor_id: professorId, curso_disciplina_id: cursoDisciplinaId })
      .first('id');
    return !!vinculo;
  },

  // Linhas da matriz do vínculo do professor pelas quais ele é responsável pelo conteúdo acadêmico.
  async listarResponsabilidadesDeConteudo(professorId: string, cursoDisciplinaIds: string[]) {
    if (!cursoDisciplinaIds.length) return [];
    return db('piv.conteudo_disciplina')
      .join('piv.curso_disciplina', 'piv.conteudo_disciplina.curso_disciplina_id', 'piv.curso_disciplina.id')
      .join('piv.disciplinas', 'piv.curso_disciplina.disciplina_id', 'piv.disciplinas.id')
      .join('piv.curso', 'piv.curso_disciplina.curso_id', 'piv.curso.id')
      .where('piv.conteudo_disciplina.responsavel_professor_id', professorId)
      .whereIn('piv.conteudo_disciplina.curso_disciplina_id', cursoDisciplinaIds)
      .select('piv.disciplinas.nome as disciplina', 'piv.curso.nome as curso');
  },
};
