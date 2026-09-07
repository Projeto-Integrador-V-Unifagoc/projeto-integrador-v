import type { Knex } from "knex";

const SCHEMA = "piv";

/**
 * Normaliza o status de matrícula e de vínculo acadêmico.
 *
 * O módulo de documentos gravava "MATRICULADO" e "CANCELADO" ao validar um
 * arquivo, enquanto o restante do sistema usa o vocabulário em minúsculas
 * ("ativa", "trancada", "cancelada", "concluida"). Registros gravados pela
 * versão anterior ficam invisíveis para as consultas de vaga, para a chamada do
 * professor e para os relatórios, por isso são convertidos aqui.
 *
 * A migration também passa a restringir os valores aceitos por CHECK, de modo
 * que uma regressão futura falhe na escrita em vez de corromper o histórico em
 * silêncio. "pendente" entra no domínio para representar a matrícula que aguarda
 * a validação dos documentos.
 */

const STATUS_MATRICULA = ["pendente", "ativa", "trancada", "cancelada", "concluida"];
const STATUS_VINCULO = ["ativa", "cancelada", "aprovada", "reprovada"];

const listaSql = (valores: string[]) => valores.map((v) => `'${v}'`).join(", ");

export async function up(db: Knex): Promise<void> {
    await db.raw(`
        UPDATE ${SCHEMA}.matricula SET status = CASE lower(status)
            WHEN 'matriculado' THEN 'ativa'
            WHEN 'ativo'       THEN 'ativa'
            WHEN 'cancelado'   THEN 'cancelada'
            WHEN 'trancado'    THEN 'trancada'
            WHEN 'concluido'   THEN 'concluida'
            ELSE lower(status)
        END
        WHERE status <> lower(status) OR lower(status) NOT IN (${listaSql(STATUS_MATRICULA)})
    `);

    await db.raw(`
        UPDATE ${SCHEMA}.matricula_turma_disciplina SET status = CASE lower(status)
            WHEN 'ativo'      THEN 'ativa'
            WHEN 'cancelado'  THEN 'cancelada'
            WHEN 'aprovado'   THEN 'aprovada'
            WHEN 'reprovado'  THEN 'reprovada'
            ELSE lower(status)
        END
        WHERE status <> lower(status) OR lower(status) NOT IN (${listaSql(STATUS_VINCULO)})
    `);

    // Qualquer valor remanescente fora do domínio vira 'ativa': é o estado mais
    // conservador, porque mantém o registro visível para conferência manual em
    // vez de escondê-lo como cancelado.
    await db.raw(`
        UPDATE ${SCHEMA}.matricula SET status = 'ativa'
        WHERE status NOT IN (${listaSql(STATUS_MATRICULA)})
    `);
    await db.raw(`
        UPDATE ${SCHEMA}.matricula_turma_disciplina SET status = 'ativa'
        WHERE status NOT IN (${listaSql(STATUS_VINCULO)})
    `);

    await db.raw(`ALTER TABLE ${SCHEMA}.matricula DROP CONSTRAINT IF EXISTS matricula_status_check`);
    await db.raw(`
        ALTER TABLE ${SCHEMA}.matricula
        ADD CONSTRAINT matricula_status_check CHECK (status IN (${listaSql(STATUS_MATRICULA)}))
    `);

    await db.raw(`ALTER TABLE ${SCHEMA}.matricula_turma_disciplina DROP CONSTRAINT IF EXISTS matricula_turma_disciplina_status_check`);
    await db.raw(`
        ALTER TABLE ${SCHEMA}.matricula_turma_disciplina
        ADD CONSTRAINT matricula_turma_disciplina_status_check CHECK (status IN (${listaSql(STATUS_VINCULO)}))
    `);
}

export async function down(db: Knex): Promise<void> {
    // Os valores originais em caixa alta não são restaurados: eram inválidos para
    // o restante do sistema. O rollback apenas remove as restrições.
    await db.raw(`ALTER TABLE ${SCHEMA}.matricula DROP CONSTRAINT IF EXISTS matricula_status_check`);
    await db.raw(`ALTER TABLE ${SCHEMA}.matricula_turma_disciplina DROP CONSTRAINT IF EXISTS matricula_turma_disciplina_status_check`);
}
