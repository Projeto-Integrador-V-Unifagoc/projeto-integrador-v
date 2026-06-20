import { professorRepository } from '../repository/professorRepository.js';
import type { AtualizarProfessor, CriarProfessorDTO, FiltroProfessor } from '../models/professorModels.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/professorErrors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UFS = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);

function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base - 1; i++) soma += Number(cpf[i]) * (base - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(10) === Number(cpf[9]) && digito(11) === Number(cpf[10]);
}

function normalizar(dados: CriarProfessorDTO | AtualizarProfessor) {
  const resultado: any = { ...dados };
  if (dados.nome !== undefined) resultado.nome = dados.nome.trim().replace(/\s+/g, ' ');
  if (dados.cpf !== undefined) resultado.cpf = dados.cpf.replace(/\D/g, '');
  if (dados.cep !== undefined) resultado.cep = dados.cep.replace(/\D/g, '');
  if (dados.estado !== undefined) resultado.estado = dados.estado.trim().toUpperCase();
  for (const campo of ['logradouro', 'numero', 'bairro'] as const) {
    if (dados[campo] !== undefined) resultado[campo] = dados[campo]!.trim();
  }
  return resultado;
}

function validarCampos(dados: CriarProfessorDTO | AtualizarProfessor, criacao: boolean) {
  const obrigatorios = ['nome','cpf','data_nascimento','logradouro','numero','bairro','cidade_id','estado','cep','curso_id'] as const;
  if (criacao) for (const campo of obrigatorios) if (!dados[campo]) throw new ValidationError(`O campo ${campo} é obrigatório.`);
  if (dados.nome !== undefined && dados.nome.length < 3) throw new ValidationError('Nome inválido.');
  if (dados.cpf !== undefined && !cpfValido(dados.cpf)) throw new ValidationError('CPF inválido.');
  if (dados.cep !== undefined && !/^\d{8}$/.test(dados.cep)) throw new ValidationError('CEP inválido.');
  if (dados.estado !== undefined && !UFS.has(dados.estado)) throw new ValidationError('UF inválida.');
  if (dados.curso_id !== undefined && !UUID.test(dados.curso_id)) throw new ValidationError('Curso inválido.');
  if (dados.faculdade_id !== undefined && !UUID.test(dados.faculdade_id)) throw new ValidationError('Faculdade inválida.');
  if (dados.cidade_id !== undefined && !/^\d{7}$/.test(dados.cidade_id)) throw new ValidationError('Código IBGE da cidade inválido.');
  if (dados.data_nascimento !== undefined) {
    const data = new Date(String(dados.data_nascimento) + (typeof dados.data_nascimento === 'string' ? 'T00:00:00' : ''));
    if (Number.isNaN(data.getTime()) || data > new Date()) throw new ValidationError('Data de nascimento inválida.');
  }
}

async function validarRelacionamentos(dados: CriarProfessorDTO | AtualizarProfessor, atual?: any) {
  const cursoId = dados.curso_id ?? atual?.curso_id;
  const cidadeId = dados.cidade_id ?? atual?.cidade_id;
  if (!cursoId || !cidadeId) throw new ValidationError('Curso e cidade são obrigatórios.');
  const [curso, cidade] = await Promise.all([
    professorRepository.buscarCursoComFaculdade(cursoId),
    professorRepository.buscarCidadePorIbge(cidadeId),
  ]);
  if (!curso) throw new ValidationError('Curso inexistente.');
  if (!cidade) throw new ValidationError('Cidade inexistente.');
  if (dados.estado && cidade.uf !== dados.estado) throw new ValidationError('A UF não corresponde à cidade informada.');
  if (dados.faculdade_id && dados.faculdade_id !== curso.faculdade_id) throw new ValidationError('A faculdade não corresponde ao curso informado.');
  return curso.faculdade_id as string;
}

function traduzirErroBanco(erro: any): never {
  if (erro?.code === '23505') throw new ConflictError('Já existe um professor cadastrado com este CPF.');
  if (erro?.code === '23503') throw new ValidationError('Relacionamento acadêmico inválido.');
  throw erro;
}

async function listarTodos(filtro: FiltroProfessor = {}) { return professorRepository.listarTodos(filtro); }
async function listarOpcoes() { return professorRepository.listarOpcoes(); }

async function buscarPorId(id: string) {
  if (!UUID.test(id)) throw new ValidationError('ID inválido.');
  const professor = await professorRepository.buscarPorId(id);
  if (!professor) throw new NotFoundError();
  return professor;
}

async function criar(payload: CriarProfessorDTO) {
  const dados = normalizar(payload) as CriarProfessorDTO;
  validarCampos(dados, true);
  if (await professorRepository.buscarPorCpf(dados.cpf)) throw new ConflictError('Já existe um professor cadastrado com este CPF.');
  const faculdade_id = await validarRelacionamentos(dados);
  try { return await professorRepository.criar({ ...dados, faculdade_id }); }
  catch (erro) { traduzirErroBanco(erro); }
}

async function atualizar(id: string, payload: AtualizarProfessor) {
  const atual = await buscarPorId(id);
  const dados = normalizar(payload) as AtualizarProfessor;
  if (!Object.keys(dados).length) throw new ValidationError('Nenhum campo enviado para atualização.');
  validarCampos(dados, false);
  if (dados.cpf) {
    const existente = await professorRepository.buscarPorCpf(dados.cpf);
    if (existente && existente.id !== id) throw new ConflictError('Já existe um professor cadastrado com este CPF.');
  }
  const faculdade_id = await validarRelacionamentos(dados, atual);
  try { return await professorRepository.atualizar(id, { ...dados, ...(dados.curso_id ? { faculdade_id } : {}) }); }
  catch (erro) { traduzirErroBanco(erro); }
}

async function definirAtivo(id: string, ativo: boolean) {
  await buscarPorId(id);
  return professorRepository.definirAtivo(id, ativo);
}

export const professorService = { listarTodos, listarOpcoes, buscarPorId, criar, atualizar, definirAtivo };
