import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { professorRepository } from '../repository/professorRepository.js';
import { professorService } from './professorServices.js';

const original = { ...professorRepository };
const ids = {
  professor: '11111111-1111-4111-8111-111111111111',
  curso: '22222222-2222-4222-8222-222222222222',
  faculdade: '33333333-3333-4333-8333-333333333333',
};
const payload = {
  nome: '  Maria   Silva ', cpf: '529.982.247-25', data_nascimento: '1990-01-01',
  logradouro: ' Rua A ', numero: '10', bairro: 'Centro', cidade_id: '3652500',
  estado: 'mg', cep: '36500-000', curso_id: ids.curso,
};

describe('professorService', () => {
  beforeEach(() => {
    Object.assign(professorRepository, original);
    professorRepository.buscarPorCpf = async () => undefined;
    professorRepository.buscarCursoComFaculdade = async () => ({ id: ids.curso, faculdade_id: ids.faculdade });
    professorRepository.buscarCidadePorIbge = async () => ({ ibge: '3652500', uf: 'MG' });
  });
  afterEach(() => Object.assign(professorRepository, original));

  it('normaliza e cria o cadastro sem credenciais', async () => {
    let recebido: any;
    professorRepository.criar = async (dados: any) => (recebido = dados, { id: ids.professor, ...dados } as any);
    const criado = await professorService.criar(payload);
    expect(criado.id).toBe(ids.professor);
    expect(recebido.nome).toBe('Maria Silva');
    expect(recebido.cpf).toBe('52998224725');
    expect(recebido.cep).toBe('36500000');
    expect(recebido.faculdade_id).toBe(ids.faculdade);
    expect('senha' in recebido).toBe(false);
    expect('email' in recebido).toBe(false);
  });

  it('rejeita CPF inválido', async () => {
    await expect(professorService.criar({ ...payload, cpf: '111.111.111-11' })).rejects.toThrow(/CPF inválido/);
  });

  it('rejeita curso e faculdade incompatíveis', async () => {
    await expect(
      professorService.criar({ ...payload, faculdade_id: '44444444-4444-4444-8444-444444444444' }),
    ).rejects.toThrow(/faculdade não corresponde/);
  });

  it('rejeita cidade inexistente', async () => {
    professorRepository.buscarCidadePorIbge = async () => undefined;
    await expect(professorService.criar(payload)).rejects.toThrow(/Cidade inexistente/);
  });

  it('traduz CPF duplicado para conflito', async () => {
    professorRepository.buscarPorCpf = async () => ({ id: ids.professor });
    await expect(professorService.criar(payload)).rejects.toMatchObject({ status: 409 });
  });

  it('não oferece professores inativos em novas atribuições', async () => {
    let chamou = false;
    professorRepository.listarOpcoes = async () => (chamou = true, []);
    expect(await professorService.listarOpcoes()).toEqual([]);
    expect(chamou).toBe(true);
  });

  it('aceita UUID canônico já persistido pelo PostgreSQL ao alterar status', async () => {
    const idPersistido = '99999999-9999-9999-9999-999999999993';
    professorRepository.buscarPorId = async () => ({ id: idPersistido } as any);
    professorRepository.definirAtivo = async (id: string, ativo: boolean) => ({ id, ativo } as any);
    expect(await professorService.definirAtivo(idPersistido, false)).toEqual({ id: idPersistido, ativo: false });
  });

  it('listarTodos delega ao repositorio com o filtro informado', async () => {
    let filtroRecebido: any;
    professorRepository.listarTodos = async (filtro: any) => (filtroRecebido = filtro, []);
    await professorService.listarTodos({ ativo: true } as any);
    expect(filtroRecebido).toEqual({ ativo: true });
  });

  it('buscarPorId rejeita id invalido e professor inexistente', async () => {
    await expect(professorService.buscarPorId('nao-uuid')).rejects.toThrow(/ID inválido/);
    professorRepository.buscarPorId = async () => undefined;
    await expect(professorService.buscarPorId(ids.professor)).rejects.toMatchObject({ status: 404 });
  });

  it('traduz violacao de FK do banco na criacao', async () => {
    professorRepository.criar = async () => { throw { code: '23503' }; };
    await expect(professorService.criar(payload)).rejects.toThrow(/Relacionamento acadêmico inválido/);
  });

  it('repropaga erros de banco nao mapeados na criacao', async () => {
    professorRepository.criar = async () => { throw new Error('falha de conexão'); };
    await expect(professorService.criar(payload)).rejects.toThrow('falha de conexão');
  });

  it('valida campos obrigatorios, formatos e data de nascimento futura na criacao', async () => {
    const { nome, ...semNome } = payload;
    await expect(professorService.criar(semNome as any)).rejects.toThrow(/nome é obrigatório/);
    await expect(professorService.criar({ ...payload, nome: 'Jo' })).rejects.toThrow(/Nome inválido/);
    await expect(professorService.criar({ ...payload, cep: '123' })).rejects.toThrow(/CEP inválido/);
    await expect(professorService.criar({ ...payload, estado: 'ZZ' })).rejects.toThrow(/UF inválida/);
    await expect(professorService.criar({ ...payload, curso_id: 'nao-uuid' })).rejects.toThrow(/Curso inválido/);
    await expect(professorService.criar({ ...payload, faculdade_id: 'nao-uuid' })).rejects.toThrow(/Faculdade inválida/);
    await expect(professorService.criar({ ...payload, cidade_id: '123' })).rejects.toThrow(/Código IBGE/);
    await expect(professorService.criar({ ...payload, data_nascimento: '2999-01-01' })).rejects.toThrow(/Data de nascimento inválida/);
    await expect(professorService.criar({ ...payload, data_nascimento: 'nao-e-uma-data' })).rejects.toThrow(/Data de nascimento inválida/);
  });

  it('aceita CPF cujo digito verificador calculado e 10 (mapeado para 0)', async () => {
    professorRepository.criar = async (dados: any) => ({ id: ids.professor, ...dados } as any);
    const criado = await professorService.criar({ ...payload, cpf: '00000000604' });
    expect(criado.cpf).toBe('00000000604');
  });

  describe('atualizar', () => {
    beforeEach(() => {
      professorRepository.buscarPorId = async () => ({ id: ids.professor, curso_id: ids.curso, cidade_id: '3652500' } as any);
    });

    it('exige ao menos um campo', async () => {
      await expect(professorService.atualizar(ids.professor, {})).rejects.toThrow(/Nenhum campo enviado/);
    });

    it('valida os campos informados', async () => {
      await expect(professorService.atualizar(ids.professor, { nome: 'Jo' })).rejects.toThrow(/Nome inválido/);
    });

    it('rejeita CPF ja usado por outro professor mas aceita o proprio CPF inalterado', async () => {
      professorRepository.buscarPorCpf = async () => ({ id: 'outro-id' });
      await expect(professorService.atualizar(ids.professor, { cpf: payload.cpf })).rejects.toMatchObject({ status: 409 });

      professorRepository.buscarPorCpf = async () => ({ id: ids.professor });
      professorRepository.atualizar = async (id: string, dados: any) => ({ id, ...dados } as any);
      const atualizado = await professorService.atualizar(ids.professor, { cpf: payload.cpf });
      expect(atualizado.cpf).toBe('52998224725');
    });

    it('inclui a faculdade recalculada apenas quando o curso muda', async () => {
      let recebido: any;
      professorRepository.atualizar = async (_id: string, dados: any) => (recebido = dados, dados as any);
      await professorService.atualizar(ids.professor, { curso_id: ids.curso });
      expect(recebido.faculdade_id).toBe(ids.faculdade);

      recebido = undefined;
      await professorService.atualizar(ids.professor, { logradouro: 'Rua Nova' });
      expect(recebido.faculdade_id).toBeUndefined();
    });

    it('traduz erro de banco ao atualizar', async () => {
      professorRepository.atualizar = async () => { throw { code: '23505' }; };
      await expect(professorService.atualizar(ids.professor, { logradouro: 'Rua Nova' })).rejects.toMatchObject({ status: 409 });
    });

    it('exige curso e cidade quando nem os dados enviados nem o cadastro atual os possuem', async () => {
      professorRepository.buscarPorId = async () => ({ id: ids.professor, curso_id: undefined, cidade_id: undefined } as any);
      await expect(professorService.atualizar(ids.professor, { logradouro: 'Rua Nova' })).rejects.toThrow(/Curso e cidade são obrigatórios/);
    });

    it('rejeita curso inexistente ao atualizar', async () => {
      professorRepository.buscarCursoComFaculdade = async () => undefined;
      await expect(professorService.atualizar(ids.professor, { curso_id: ids.curso })).rejects.toThrow(/Curso inexistente/);
    });
  });
});
