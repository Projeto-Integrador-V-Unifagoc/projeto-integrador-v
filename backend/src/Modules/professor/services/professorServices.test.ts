import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
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
    assert.equal(criado.id, ids.professor);
    assert.equal(recebido.nome, 'Maria Silva');
    assert.equal(recebido.cpf, '52998224725');
    assert.equal(recebido.cep, '36500000');
    assert.equal(recebido.faculdade_id, ids.faculdade);
    assert.equal('senha' in recebido, false);
    assert.equal('email' in recebido, false);
  });

  it('rejeita CPF inválido', async () => {
    await assert.rejects(() => professorService.criar({ ...payload, cpf: '111.111.111-11' }), /CPF inválido/);
  });

  it('rejeita curso e faculdade incompatíveis', async () => {
    await assert.rejects(
      () => professorService.criar({ ...payload, faculdade_id: '44444444-4444-4444-8444-444444444444' }),
      /faculdade não corresponde/,
    );
  });

  it('rejeita cidade inexistente', async () => {
    professorRepository.buscarCidadePorIbge = async () => undefined;
    await assert.rejects(() => professorService.criar(payload), /Cidade inexistente/);
  });

  it('traduz CPF duplicado para conflito', async () => {
    professorRepository.buscarPorCpf = async () => ({ id: ids.professor });
    await assert.rejects(() => professorService.criar(payload), (erro: any) => erro.status === 409);
  });

  it('não oferece professores inativos em novas atribuições', async () => {
    let chamou = false;
    professorRepository.listarOpcoes = async () => (chamou = true, []);
    assert.deepEqual(await professorService.listarOpcoes(), []);
    assert.equal(chamou, true);
  });
});
