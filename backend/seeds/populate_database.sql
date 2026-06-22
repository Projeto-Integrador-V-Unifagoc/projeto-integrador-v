BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS piv;

INSERT INTO piv.cidade (id, nome, uf, ibge)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'UbÃ¡', 'MG', '9999101'),
  ('a1000000-0000-0000-0000-000000000002', 'Cidade Horizonte', 'MG', '9999102')
ON CONFLICT (ibge) DO UPDATE
SET nome = EXCLUDED.nome,
    uf = EXCLUDED.uf;

INSERT INTO piv.status_disciplina (id, descricao)
VALUES
  ('a1100000-0000-0000-0000-000000000001', 'Cursando'),
  ('a1100000-0000-0000-0000-000000000002', 'Aprovado'),
  ('a1100000-0000-0000-0000-000000000003', 'Reprovado'),
  ('a1100000-0000-0000-0000-000000000004', 'Trancado')
ON CONFLICT (id) DO UPDATE
SET descricao = EXCLUDED.descricao;

INSERT INTO piv.status_matricula (id, descricao)
VALUES
  ('a1200000-0000-0000-0000-000000000001', 'Ativa'),
  ('a1200000-0000-0000-0000-000000000002', 'ConcluÃ­da'),
  ('a1200000-0000-0000-0000-000000000003', 'Cancelada'),
  ('a1200000-0000-0000-0000-000000000004', 'Trancada')
ON CONFLICT (id) DO UPDATE
SET descricao = EXCLUDED.descricao;

INSERT INTO piv.usuario (id, nome, email, senha, tipo_usuario)
VALUES
  ('a2000000-0000-0000-0000-000000000001', 'Secretaria Campus Novo', 'secretaria.nova@campusnovo.local', '$2b$10$ZqVZ6yfS.ev99cz.FYwqAOJ0191JiLveHYR5Sk46Dq39lP5u/q8dS', 'secretaria'),
  ('a2000000-0000-0000-0000-000000000002', 'Livia Monteiro', 'livia.monteiro@campusnovo.local', '$2b$10$GBmUzkmWbfj/XeH37SIXWOm8zMsIeI8IJ.R9ibotFFqCngHRCghd6', 'professor'),
  ('a2000000-0000-0000-0000-000000000003', 'Rafael Nogueira', 'rafael.nogueira@campusnovo.local', '$2b$10$GBmUzkmWbfj/XeH37SIXWOm8zMsIeI8IJ.R9ibotFFqCngHRCghd6', 'professor'),
  ('a2000000-0000-0000-0000-000000000004', 'Bianca Ferreira', 'bianca.ferreira@aluno.campusnovo.local', '$2b$10$IZEewixOnjYiNn9yD5oHQOSnS37sSE/ctI5wwx94ygQTbypD9yMc2', 'aluno'),
  ('a2000000-0000-0000-0000-000000000005', 'Gustavo Ribeiro', 'gustavo.ribeiro@aluno.campusnovo.local', '$2b$10$IZEewixOnjYiNn9yD5oHQOSnS37sSE/ctI5wwx94ygQTbypD9yMc2', 'aluno'),
  ('a2000000-0000-0000-0000-000000000006', 'Helena Martins', 'helena.martins@aluno.campusnovo.local', '$2b$10$IZEewixOnjYiNn9yD5oHQOSnS37sSE/ctI5wwx94ygQTbypD9yMc2', 'aluno'),
  ('a2000000-0000-0000-0000-000000000007', 'Mateus Carvalho', 'mateus.carvalho@aluno.campusnovo.local', '$2b$10$IZEewixOnjYiNn9yD5oHQOSnS37sSE/ctI5wwx94ygQTbypD9yMc2', 'aluno')
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    senha = EXCLUDED.senha,
    tipo_usuario = EXCLUDED.tipo_usuario,
    updated_at = NOW();

INSERT INTO piv.faculdade (id, nome, cidade_id, logradouro, numero, bairro, cep)
VALUES
  ('a3000000-0000-0000-0000-000000000001', 'Centro UniversitÃ¡rio UniEduca', '9999101', 'Avenida AcadÃªmica', '1000', 'Centro', '36500-000')
ON CONFLICT (id) DO UPDATE
SET nome = EXCLUDED.nome,
    cidade_id = EXCLUDED.cidade_id,
    logradouro = EXCLUDED.logradouro,
    numero = EXCLUDED.numero,
    bairro = EXCLUDED.bairro,
    cep = EXCLUDED.cep;

INSERT INTO piv.departamento (id, codigo, nome, faculdade_id)
VALUES
  ('a3100000-0000-0000-0000-000000000001', 'DNOVO-TEC', 'Departamento de CiÃªncia da ComputaÃ§Ã£o', 'a3000000-0000-0000-0000-000000000001'),
  ('a3100000-0000-0000-0000-000000000002', 'DNOVO-GEST', 'Departamento de AdministraÃ§Ã£o', 'a3000000-0000-0000-0000-000000000001')
ON CONFLICT (codigo) DO UPDATE
SET nome = EXCLUDED.nome,
    faculdade_id = EXCLUDED.faculdade_id;

INSERT INTO piv.curso (id, codigo, nome, departamento_id)
VALUES
  ('a3200000-0000-0000-0000-000000000001', 'TSI-NOVO', 'AnÃ¡lise e Desenvolvimento de Sistemas', (SELECT id FROM piv.departamento WHERE codigo = 'DNOVO-TEC')),
  ('a3200000-0000-0000-0000-000000000002', 'GNE-NOVO', 'AdministraÃ§Ã£o', (SELECT id FROM piv.departamento WHERE codigo = 'DNOVO-GEST'))
ON CONFLICT (codigo) DO UPDATE
SET nome = EXCLUDED.nome,
    departamento_id = EXCLUDED.departamento_id;

INSERT INTO piv.pessoa (id, nome, data_nascimento, logradouro, numero, bairro, cidade_id, estado, cep, cpf)
VALUES
  ('a4000000-0000-0000-0000-000000000001', 'Livia Monteiro', '1985-04-12', 'Rua das Acacias', '10', 'Centro', '9999101', 'MG', '36500-000', '901.901.901-01'),
  ('a4000000-0000-0000-0000-000000000002', 'Rafael Nogueira', '1981-09-22', 'Rua das Acacias', '20', 'Centro', '9999101', 'MG', '36500-000', '902.902.902-02'),
  ('a4000000-0000-0000-0000-000000000003', 'Bianca Ferreira', '2001-03-12', 'Rua Primavera', '101', 'Centro', '9999101', 'MG', '36500-000', '903.903.903-03'),
  ('a4000000-0000-0000-0000-000000000004', 'Gustavo Ribeiro', '2000-04-22', 'Rua Ipe', '202', 'Centro', '9999101', 'MG', '36500-000', '904.904.904-04'),
  ('a4000000-0000-0000-0000-000000000005', 'Helena Martins', '2002-08-05', 'Rua Lavanda', '303', 'Centro', '9999101', 'MG', '36500-000', '905.905.905-05'),
  ('a4000000-0000-0000-0000-000000000006', 'Mateus Carvalho', '2001-11-18', 'Rua Manaca', '404', 'Centro', '9999101', 'MG', '36500-000', '906.906.906-06')
ON CONFLICT (cpf) DO UPDATE
SET nome = EXCLUDED.nome,
    data_nascimento = EXCLUDED.data_nascimento,
    logradouro = EXCLUDED.logradouro,
    numero = EXCLUDED.numero,
    bairro = EXCLUDED.bairro,
    cidade_id = EXCLUDED.cidade_id,
    estado = EXCLUDED.estado,
    cep = EXCLUDED.cep;

INSERT INTO piv.disciplinas (id, codigo, nome, pre_requisito, carga_horaria, ativo)
VALUES
  ('a5000000-0000-0000-0000-000000000001', 'WEB-INT', 'Desenvolvimento Web Integrado', NULL, 80, TRUE),
  ('a5000000-0000-0000-0000-000000000002', 'BD-APP', 'Banco de Dados para Aplicacoes', NULL, 80, TRUE),
  ('a5000000-0000-0000-0000-000000000003', 'UX-REQ', 'UX e Levantamento de Requisitos', NULL, 80, TRUE),
  ('a5000000-0000-0000-0000-000000000004', 'GFIN-NOVO', 'AdministraÃ§Ã£o Financeira', NULL, 60, TRUE)
ON CONFLICT (codigo) DO UPDATE
SET nome = EXCLUDED.nome,
    pre_requisito = EXCLUDED.pre_requisito,
    carga_horaria = EXCLUDED.carga_horaria,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

INSERT INTO piv.professor (id, usuario_id, pessoa_id, curso_id, faculdade_id)
VALUES
  ('a6000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000001', 'a3200000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001'),
  ('a6000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000002', 'a3200000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE
SET usuario_id = EXCLUDED.usuario_id,
    pessoa_id = EXCLUDED.pessoa_id,
    curso_id = EXCLUDED.curso_id,
    faculdade_id = EXCLUDED.faculdade_id;

INSERT INTO piv.aluno (id, usuario_id, pessoa_id, curso_id, periodo)
VALUES
  ('a7000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000004', 'a4000000-0000-0000-0000-000000000003', 'a3200000-0000-0000-0000-000000000001', '5'),
  ('a7000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000005', 'a4000000-0000-0000-0000-000000000004', 'a3200000-0000-0000-0000-000000000001', '5'),
  ('a7000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000006', 'a4000000-0000-0000-0000-000000000005', 'a3200000-0000-0000-0000-000000000001', '5'),
  ('a7000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000007', 'a4000000-0000-0000-0000-000000000006', 'a3200000-0000-0000-0000-000000000002', '3')
ON CONFLICT (id) DO UPDATE
SET usuario_id = EXCLUDED.usuario_id,
    pessoa_id = EXCLUDED.pessoa_id,
    curso_id = EXCLUDED.curso_id,
    periodo = EXCLUDED.periodo;

INSERT INTO piv.periodo_letivo (id, codigo, ano, semestre, data_inicio, data_fim, ativo, status)
VALUES
  ('a8000000-0000-0000-0000-000000000001', '2026.1-NOVO', 2026, 1, '2026-02-02', '2026-06-30', TRUE, 'ativo'),
  ('a8000000-0000-0000-0000-000000000002', '2026.2-NOVO', 2026, 2, '2026-08-03', '2026-12-18', TRUE, 'planejado')
ON CONFLICT (codigo) DO UPDATE
SET ano = EXCLUDED.ano,
    semestre = EXCLUDED.semestre,
    data_inicio = EXCLUDED.data_inicio,
    data_fim = EXCLUDED.data_fim,
    ativo = EXCLUDED.ativo,
    status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO piv.curso_disciplina (id, curso_id, disciplina_id, periodo_ideal, obrigatoria, carga_horaria, ativo)
VALUES
  ('a8100000-0000-0000-0000-000000000001', 'a3200000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 5, TRUE, 80, TRUE),
  ('a8100000-0000-0000-0000-000000000002', 'a3200000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000002', 3, TRUE, 80, TRUE),
  ('a8100000-0000-0000-0000-000000000003', 'a3200000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000003', 4, TRUE, 80, TRUE),
  ('a8100000-0000-0000-0000-000000000004', 'a3200000-0000-0000-0000-000000000002', 'a5000000-0000-0000-0000-000000000004', 3, TRUE, 60, TRUE)
ON CONFLICT (curso_id, disciplina_id) DO UPDATE
SET periodo_ideal = EXCLUDED.periodo_ideal,
    obrigatoria = EXCLUDED.obrigatoria,
    carga_horaria = EXCLUDED.carga_horaria,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

INSERT INTO piv.turma (id, periodo_letivo_id, curso_id, periodo_curricular, descricao, sigla, capacidade_alunos, turno, status)
VALUES
  ('a8200000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000001', 'a3200000-0000-0000-0000-000000000001', 5, 'ADS 5Âº perÃ­odo - Noturno', 'TSI5N-NOVO', 40, 'Noturno', 'ativa'),
  ('a8200000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000001', 'a3200000-0000-0000-0000-000000000002', 3, 'AdministraÃ§Ã£o 3Âº perÃ­odo - Noturno', 'GNE3N-NOVO', 35, 'Noturno', 'ativa')
ON CONFLICT (periodo_letivo_id, curso_id, sigla) DO UPDATE
SET periodo_curricular = EXCLUDED.periodo_curricular,
    descricao = EXCLUDED.descricao,
    capacidade_alunos = EXCLUDED.capacidade_alunos,
    turno = EXCLUDED.turno,
    status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO piv.turma_disciplina (id, turma_id, curso_disciplina_id, professor_id, status)
VALUES
  ('a8300000-0000-0000-0000-000000000001', 'a8200000-0000-0000-0000-000000000001', 'a8100000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'ativa'),
  ('a8300000-0000-0000-0000-000000000002', 'a8200000-0000-0000-0000-000000000001', 'a8100000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000001', 'ativa'),
  ('a8300000-0000-0000-0000-000000000003', 'a8200000-0000-0000-0000-000000000002', 'a8100000-0000-0000-0000-000000000004', 'a6000000-0000-0000-0000-000000000002', 'ativa')
ON CONFLICT (turma_id, curso_disciplina_id) DO UPDATE
SET professor_id = EXCLUDED.professor_id,
    status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO piv.matricula (id, aluno_id, curso_id, turma_id, status, data_matricula)
VALUES
  ('a8400000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 'a3200000-0000-0000-0000-000000000001', 'a8200000-0000-0000-0000-000000000001', 'ativa', '2026-02-03'),
  ('a8400000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-000000000002', 'a3200000-0000-0000-0000-000000000001', 'a8200000-0000-0000-0000-000000000001', 'ativa', '2026-02-03'),
  ('a8400000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000003', 'a3200000-0000-0000-0000-000000000001', 'a8200000-0000-0000-0000-000000000001', 'ativa', '2026-02-03'),
  ('a8400000-0000-0000-0000-000000000004', 'a7000000-0000-0000-0000-000000000004', 'a3200000-0000-0000-0000-000000000002', 'a8200000-0000-0000-0000-000000000002', 'ativa', '2026-02-03')
ON CONFLICT (aluno_id, turma_id) DO UPDATE
SET curso_id = EXCLUDED.curso_id,
    status = EXCLUDED.status,
    data_matricula = EXCLUDED.data_matricula,
    updated_at = NOW();

INSERT INTO piv.matricula_turma_disciplina (id, turma_disciplina_id, matricula_id, status, data_vinculo)
VALUES
  ('a8500000-0000-0000-0000-000000000001', 'a8300000-0000-0000-0000-000000000001', 'a8400000-0000-0000-0000-000000000001', 'ativa', '2026-02-03'),
  ('a8500000-0000-0000-0000-000000000002', 'a8300000-0000-0000-0000-000000000001', 'a8400000-0000-0000-0000-000000000002', 'ativa', '2026-02-03'),
  ('a8500000-0000-0000-0000-000000000003', 'a8300000-0000-0000-0000-000000000001', 'a8400000-0000-0000-0000-000000000003', 'ativa', '2026-02-03'),
  ('a8500000-0000-0000-0000-000000000004', 'a8300000-0000-0000-0000-000000000002', 'a8400000-0000-0000-0000-000000000001', 'ativa', '2026-02-03'),
  ('a8500000-0000-0000-0000-000000000005', 'a8300000-0000-0000-0000-000000000002', 'a8400000-0000-0000-0000-000000000002', 'ativa', '2026-02-03'),
  ('a8500000-0000-0000-0000-000000000006', 'a8300000-0000-0000-0000-000000000003', 'a8400000-0000-0000-0000-000000000004', 'ativa', '2026-02-03')
ON CONFLICT (matricula_id, turma_disciplina_id) DO UPDATE
SET status = EXCLUDED.status,
    data_vinculo = EXCLUDED.data_vinculo,
    updated_at = NOW();

INSERT INTO piv.local (id, codigo)
VALUES
  ('a9000000-0000-0000-0000-000000000001', 'LAB-NOVO-01'),
  ('a9000000-0000-0000-0000-000000000002', 'SALA-NOVO-203')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO piv.aula (id, data, local_id, professor_id, turma_disciplina_id)
VALUES
  ('a9100000-0000-0000-0000-000000000001', '2026-02-10 19:00:00-03', 'a9000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a8300000-0000-0000-0000-000000000001'),
  ('a9100000-0000-0000-0000-000000000002', '2026-02-12 19:00:00-03', 'a9000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a8300000-0000-0000-0000-000000000001'),
  ('a9100000-0000-0000-0000-000000000003', '2026-02-11 19:00:00-03', 'a9000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000002', 'a8300000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE
SET data = EXCLUDED.data,
    local_id = EXCLUDED.local_id,
    professor_id = EXCLUDED.professor_id,
    turma_disciplina_id = EXCLUDED.turma_disciplina_id;

INSERT INTO piv.frequencia (id, aula_id, matricula_turma_disciplina_id, status, data, justificativa)
VALUES
  ('a9200000-0000-0000-0000-000000000001', 'a9100000-0000-0000-0000-000000000001', 'a8500000-0000-0000-0000-000000000001', 'PRESENTE', '2026-02-10', NULL),
  ('a9200000-0000-0000-0000-000000000002', 'a9100000-0000-0000-0000-000000000001', 'a8500000-0000-0000-0000-000000000002', 'PRESENTE', '2026-02-10', NULL),
  ('a9200000-0000-0000-0000-000000000003', 'a9100000-0000-0000-0000-000000000001', 'a8500000-0000-0000-0000-000000000003', 'AUSENTE', '2026-02-10', 'Atestado mÃ©dico entregue Ã  secretaria.'),
  ('a9200000-0000-0000-0000-000000000004', 'a9100000-0000-0000-0000-000000000002', 'a8500000-0000-0000-0000-000000000001', 'PRESENTE', '2026-02-12', NULL),
  ('a9200000-0000-0000-0000-000000000005', 'a9100000-0000-0000-0000-000000000002', 'a8500000-0000-0000-0000-000000000002', 'AUSENTE', '2026-02-12', 'Compromisso familiar informado pelo aluno.'),
  ('a9200000-0000-0000-0000-000000000006', 'a9100000-0000-0000-0000-000000000003', 'a8500000-0000-0000-0000-000000000006', 'PRESENTE', '2026-02-11', NULL)
ON CONFLICT (aula_id, matricula_turma_disciplina_id) DO UPDATE
SET status = EXCLUDED.status,
    data = EXCLUDED.data,
    justificativa = EXCLUDED.justificativa,
    updated_at = NOW();

INSERT INTO piv.avaliacao (id, tipo_avaliacao, descricao_avaliacao, data_lancamento, valor, nota, data_devolucao, turma_disciplina_id, matricula_turma_disciplina_id)
VALUES
  ('a9300000-0000-0000-0000-000000000001', 'PROVA', 'Prova 1 de Desenvolvimento Web Integrado', '2026-03-20 19:00:00-03', 30.00, 27.50, '2026-03-27', 'a8300000-0000-0000-0000-000000000001', 'a8500000-0000-0000-0000-000000000001'),
  ('a9300000-0000-0000-0000-000000000002', 'PROVA', 'Prova 1 de Desenvolvimento Web Integrado', '2026-03-20 19:00:00-03', 30.00, 24.00, '2026-03-27', 'a8300000-0000-0000-0000-000000000001', 'a8500000-0000-0000-0000-000000000002'),
  ('a9300000-0000-0000-0000-000000000003', 'TRABALHO', 'ProtÃ³tipo funcional do projeto', '2026-04-15 19:00:00-03', 40.00, 36.00, '2026-04-25', 'a8300000-0000-0000-0000-000000000001', 'a8500000-0000-0000-0000-000000000003'),
  ('a9300000-0000-0000-0000-000000000004', 'TRABALHO', 'Plano financeiro aplicado ao negocio', '2026-04-10 19:00:00-03', 40.00, 32.00, '2026-04-20', 'a8300000-0000-0000-0000-000000000003', 'a8500000-0000-0000-0000-000000000006')
ON CONFLICT (id) DO UPDATE
SET tipo_avaliacao = EXCLUDED.tipo_avaliacao,
    descricao_avaliacao = EXCLUDED.descricao_avaliacao,
    data_lancamento = EXCLUDED.data_lancamento,
    valor = EXCLUDED.valor,
    nota = EXCLUDED.nota,
    data_devolucao = EXCLUDED.data_devolucao,
    turma_disciplina_id = EXCLUDED.turma_disciplina_id,
    matricula_turma_disciplina_id = EXCLUDED.matricula_turma_disciplina_id;

INSERT INTO piv.matricula_documento (id, matricula_id, tipo_documento, nome_arquivo, caminho_arquivo, valido)
VALUES
  ('a9400000-0000-0000-0000-000000000001', 'a8400000-0000-0000-0000-000000000001', 'IDENTIDADE', 'rg_bianca_ferreira.pdf', '/uploads/documentos/rg_bianca_ferreira.pdf', TRUE),
  ('a9400000-0000-0000-0000-000000000002', 'a8400000-0000-0000-0000-000000000002', 'COMPROVANTE_RESIDENCIA', 'comprovante_gustavo_ribeiro.pdf', '/uploads/documentos/comprovante_gustavo_ribeiro.pdf', FALSE)
ON CONFLICT (id) DO UPDATE
SET matricula_id = EXCLUDED.matricula_id,
    tipo_documento = EXCLUDED.tipo_documento,
    nome_arquivo = EXCLUDED.nome_arquivo,
    caminho_arquivo = EXCLUDED.caminho_arquivo,
    valido = EXCLUDED.valido,
    updated_at = NOW();

INSERT INTO piv.documento (id, aluno_id, tipo_documento, nome_arquivo, caminho_arquivo, status, observacao)
VALUES
  ('a9500000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 'IDENTIDADE', 'rg_bianca_ferreira.pdf', '/uploads/documentos/rg_bianca_ferreira.pdf', 'APROVADO', NULL),
  ('a9500000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-000000000002', 'COMPROVANTE_RESIDENCIA', 'comprovante_gustavo_ribeiro.pdf', '/uploads/documentos/comprovante_gustavo_ribeiro.pdf', 'PENDENTE', 'Aguardando conferÃªncia da secretaria.')
ON CONFLICT (id) DO UPDATE
SET aluno_id = EXCLUDED.aluno_id,
    tipo_documento = EXCLUDED.tipo_documento,
    nome_arquivo = EXCLUDED.nome_arquivo,
    caminho_arquivo = EXCLUDED.caminho_arquivo,
    status = EXCLUDED.status,
    observacao = EXCLUDED.observacao,
    updated_at = NOW();

COMMIT;

