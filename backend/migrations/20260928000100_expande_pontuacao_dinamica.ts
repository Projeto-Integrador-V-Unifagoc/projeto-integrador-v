import type { Knex } from "knex";

/** Nenhuma regra é criada aqui. A representação histórica tem preflight próprio. */
export async function up(db: Knex): Promise<void> {
  await db.raw(`
    CREATE TABLE piv.regra_pontuacao (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      curso_id uuid NOT NULL REFERENCES piv.curso(id) ON DELETE RESTRICT,
      periodo_letivo_id uuid NOT NULL REFERENCES piv.periodo_letivo(id) ON DELETE RESTRICT,
      total_pontos numeric NOT NULL,
      origem text NOT NULL,
      versao integer NOT NULL DEFAULT 1,
      usada_em timestamptz,
      criada_por_usuario_id uuid REFERENCES piv.usuario(id) ON DELETE RESTRICT,
      atualizada_por_usuario_id uuid REFERENCES piv.usuario(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT regra_pontuacao_par_unique UNIQUE (curso_id, periodo_letivo_id)
    );
    CREATE TABLE piv.subgrupo_avaliacao (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      regra_pontuacao_id uuid NOT NULL REFERENCES piv.regra_pontuacao(id) ON DELETE RESTRICT,
      nome text NOT NULL,
      orcamento_pontos numeric NOT NULL,
      modo_quantidade text NOT NULL,
      quantidade_fixa integer,
      ordem integer NOT NULL
    );
    CREATE INDEX subgrupo_avaliacao_regra_idx ON piv.subgrupo_avaliacao(regra_pontuacao_id);
    CREATE TABLE piv.regra_pontuacao_auditoria (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      regra_pontuacao_id uuid NOT NULL REFERENCES piv.regra_pontuacao(id) ON DELETE RESTRICT,
      usuario_id uuid REFERENCES piv.usuario(id) ON DELETE RESTRICT,
      perfil text NOT NULL,
      acao text NOT NULL,
      anterior jsonb,
      novo jsonb,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX regra_pontuacao_auditoria_regra_idx
      ON piv.regra_pontuacao_auditoria(regra_pontuacao_id, criado_em);
    ALTER TABLE piv.turma_disciplina
      ADD COLUMN regra_pontuacao_id uuid REFERENCES piv.regra_pontuacao(id) ON DELETE RESTRICT,
      ADD COLUMN pontuacao_vinculada_em timestamptz;
    CREATE INDEX turma_disciplina_regra_idx ON piv.turma_disciplina(regra_pontuacao_id);
    ALTER TABLE piv.avaliacao
      ADD COLUMN subgrupo_id uuid REFERENCES piv.subgrupo_avaliacao(id) ON DELETE RESTRICT,
      ADD COLUMN primeira_nota_em timestamptz,
      ALTER COLUMN valor TYPE numeric,
      DROP CONSTRAINT avaliacao_valor_tipo_check,
      DROP CONSTRAINT avaliacao_tipo_check,
      ADD CONSTRAINT avaliacao_tipo_check CHECK
        (tipo_avaliacao IN ('REGULAR', 'PROVA', 'TPI', 'TRABALHO', 'RECUPERACAO'));
    CREATE INDEX avaliacao_oferta_subgrupo_idx ON piv.avaliacao(turma_disciplina_id, subgrupo_id);
    ALTER TABLE piv.nota ALTER COLUMN valor TYPE numeric;
    ALTER TABLE piv.nota_auditoria
      ALTER COLUMN valor_anterior TYPE numeric,
      ALTER COLUMN valor_novo TYPE numeric;
  `);
}

/** Verificação anterior a qualquer remoção de guards ou redução de precisão. */
export async function conferirRetornoLegado(db: Knex): Promise<void> {
  const resultado = await db.raw(`
    SELECT
      EXISTS (SELECT 1 FROM piv.regra_pontuacao WHERE origem <> 'HISTORICA' OR total_pontos <> 100)
      OR EXISTS (SELECT 1 FROM piv.regra_pontuacao_auditoria WHERE acao <> 'ADOCAO_HISTORICA')
      OR EXISTS (SELECT 1 FROM piv.avaliacao WHERE tipo_avaliacao NOT IN ('PROVA','TPI','TRABALHO','RECUPERACAO')
        OR valor::text IN ('NaN','Infinity','-Infinity') OR scale(valor) > 2 OR valor <= 0 OR valor >= 100000000
        OR (tipo_avaliacao = 'PROVA' AND valor <> 20)
        OR (tipo_avaliacao = 'TPI' AND valor <> 5)
        OR (tipo_avaliacao = 'RECUPERACAO' AND valor <> 100))
      OR EXISTS (SELECT 1 FROM piv.nota WHERE valor::text IN ('NaN','Infinity','-Infinity')
        OR scale(valor) > 2 OR valor < 0 OR valor >= 10000)
      OR EXISTS (SELECT 1 FROM piv.nota_auditoria WHERE
        (valor_anterior IS NOT NULL AND (valor_anterior::text IN ('NaN','Infinity','-Infinity')
          OR scale(valor_anterior) > 2 OR valor_anterior < 0 OR valor_anterior >= 10000))
        OR (valor_novo IS NOT NULL AND (valor_novo::text IN ('NaN','Infinity','-Infinity')
          OR scale(valor_novo) > 2 OR valor_novo < 0 OR valor_novo >= 10000)))
      OR EXISTS (SELECT 1 FROM piv.avaliacao GROUP BY turma_disciplina_id HAVING
        count(*) FILTER (WHERE tipo_avaliacao = 'PROVA') > 3
        OR count(*) FILTER (WHERE tipo_avaliacao = 'TPI') > 1
        OR coalesce(sum(valor) FILTER (WHERE tipo_avaliacao = 'TRABALHO'), 0) > 35)
      -- O legado ignora REC quando o regular já alcança60; o novo mantém max.
      -- Uma retificação posterior pode criar essa divergência sem mudar a forma física.
      OR EXISTS (
        SELECT 1 FROM piv.matricula_turma_disciplina m
        JOIN LATERAL (
          SELECT sum(a.valor) maximo,count(*) quantidade,count(n.id) lancadas,
            coalesce(sum(n.valor),0) pontos
          FROM piv.avaliacao a LEFT JOIN piv.nota n
            ON n.avaliacao_id=a.id AND n.matricula_turma_disciplina_id=m.id
          WHERE a.turma_disciplina_id=m.turma_disciplina_id AND a.tipo_avaliacao<>'RECUPERACAO'
        ) regular ON true
        JOIN piv.avaliacao rec ON rec.turma_disciplina_id=m.turma_disciplina_id AND rec.tipo_avaliacao='RECUPERACAO'
        JOIN piv.nota nr ON nr.avaliacao_id=rec.id AND nr.matricula_turma_disciplina_id=m.id
        WHERE regular.maximo=100 AND regular.quantidade=regular.lancadas
          AND regular.pontos>=60 AND nr.valor>regular.pontos
      )
      AS incompativel
  `);
  if (resultado.rows[0].incompativel) {
    throw new Error("RETORNO_INCOMPATIVEL: preservar schema e dados; há escritas incompatíveis com a versão anterior.");
  }
}

/** Mantém a verificação válida até o fim do down; nunca usar em preflight somente leitura. */
export async function bloquearRetornoPontuacao(db: Knex): Promise<void> {
  if (!db.isTransaction) throw new Error("O retorno exige uma transação inteira, com escritores suspensos.");
  await db.raw(`LOCK TABLE piv.periodo_letivo,piv.turma,piv.curso_disciplina,piv.professor,
    piv.regra_pontuacao,piv.turma_disciplina,piv.avaliacao,piv.matricula,
    piv.matricula_turma_disciplina,piv.nota,piv.nota_autorizacao_excepcional,
    piv.nota_auditoria,piv.subgrupo_avaliacao,piv.regra_pontuacao_auditoria IN ACCESS EXCLUSIVE MODE`);
  await conferirRetornoLegado(db);
}

export async function down(db: Knex): Promise<void> {
  await bloquearRetornoPontuacao(db);
  const { rows } = await db.raw(`SELECT
    EXISTS (SELECT 1 FROM piv.regra_pontuacao)
    OR EXISTS (SELECT 1 FROM piv.subgrupo_avaliacao)
    OR EXISTS (SELECT 1 FROM piv.regra_pontuacao_auditoria) AS presente`);
  if (rows[0].presente) throw new Error("RETORNO_INCOMPATIVEL: desfazer primeiro somente a adoção técnica compatível.");
  await db.raw(`
    ALTER TABLE piv.avaliacao DROP COLUMN primeira_nota_em, DROP COLUMN subgrupo_id,
      ALTER COLUMN valor TYPE numeric(10,2), DROP CONSTRAINT avaliacao_tipo_check,
      ADD CONSTRAINT avaliacao_tipo_check CHECK (tipo_avaliacao IN ('PROVA','TPI','TRABALHO','RECUPERACAO')),
      ADD CONSTRAINT avaliacao_valor_tipo_check CHECK (
        (tipo_avaliacao = 'PROVA' AND valor = 20) OR (tipo_avaliacao = 'TPI' AND valor = 5)
        OR (tipo_avaliacao = 'TRABALHO' AND valor > 0) OR (tipo_avaliacao = 'RECUPERACAO' AND valor = 100));
    ALTER TABLE piv.turma_disciplina DROP COLUMN pontuacao_vinculada_em, DROP COLUMN regra_pontuacao_id;
    ALTER TABLE piv.nota ALTER COLUMN valor TYPE numeric(6,2);
    ALTER TABLE piv.nota_auditoria ALTER COLUMN valor_anterior TYPE numeric(6,2), ALTER COLUMN valor_novo TYPE numeric(6,2);
    DROP TABLE piv.regra_pontuacao_auditoria;
    DROP TABLE piv.subgrupo_avaliacao;
    DROP TABLE piv.regra_pontuacao;
  `);
}
