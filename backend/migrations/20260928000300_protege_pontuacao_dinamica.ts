import type { Knex } from "knex";
import { bloquearRetornoPontuacao } from "./20260928000100_expande_pontuacao_dinamica";

// Caminhos históricos: nomes são obtidos do catálogo, incluindo nomes truncados.
const fks = [
  ["curso_disciplina", "curso_id", "curso"],
  ["curso_disciplina", "disciplina_id", "disciplinas"],
  ["matricula", "aluno_id", "aluno"],
  ["turma_disciplina", "turma_id", "turma"],
  ["matricula_turma_disciplina", "matricula_id", "matricula"],
  ["matricula_turma_disciplina", "turma_disciplina_id", "turma_disciplina"],
  ["avaliacao", "turma_disciplina_id", "turma_disciplina"],
  ["nota", "avaliacao_id", "avaliacao"],
  ["nota", "matricula_turma_disciplina_id", "matricula_turma_disciplina"],
  ["nota_auditoria", "nota_id", "nota"],
  ["nota_autorizacao_excepcional", "avaliacao_id", "avaliacao"],
  ["nota_autorizacao_excepcional", "matricula_turma_disciplina_id", "matricula_turma_disciplina"],
] as const;

async function alterarFks(db: Knex, exclusao: "RESTRICT" | "CASCADE"): Promise<void> {
  for (const [tabela, coluna, pai] of fks) {
    const { rows } = await db.raw(`SELECT c.conname FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(c.conkey)
      WHERE c.contype='f' AND n.nspname='piv' AND t.relname=? AND a.attname=?`, [tabela, coluna]);
    if (rows.length !== 1) throw new Error(`FK histórica não inequívoca: ${tabela}.${coluna}`);
    await db.raw(`ALTER TABLE ?? DROP CONSTRAINT ??, ADD CONSTRAINT ?? FOREIGN KEY (??) REFERENCES ??(id) ON DELETE ${exclusao}`,
      [`piv.${tabela}`, rows[0].conname, rows[0].conname, coluna, `piv.${pai}`]);
  }
}

const pontos = [
  ["regra_pontuacao", "total_pontos", "> 0"],
  ["subgrupo_avaliacao", "orcamento_pontos", "> 0"],
  ["avaliacao", "valor", "> 0"],
  ["nota", "valor", ">= 0"],
  ["nota_auditoria", "valor_anterior", ">= 0"],
  ["nota_auditoria", "valor_novo", ">= 0"],
] as const;

export async function up(db: Knex): Promise<void> {
  // A ativação sobre histórico só é possível após a representação completa.
  const { rows } = await db.raw(`SELECT EXISTS (
    SELECT 1 FROM piv.avaliacao a JOIN piv.turma_disciplina td ON td.id=a.turma_disciplina_id
    WHERE td.regra_pontuacao_id IS NULL OR td.pontuacao_vinculada_em IS NULL
      OR (a.tipo_avaliacao <> 'RECUPERACAO' AND a.subgrupo_id IS NULL)
      OR (EXISTS (SELECT 1 FROM piv.nota n WHERE n.avaliacao_id=a.id) AND a.primeira_nota_em IS NULL)
    ) AS incompleto`);
  if (rows[0].incompleto) throw new Error("ADOCAO_PENDENTE: executar preflight e adoção histórica antes dos guards.");
  for (const [tabela, coluna, sinal] of pontos) {
    await db.raw(`ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (
      ?? IS NULL OR (??::text NOT IN ('NaN','Infinity','-Infinity') AND scale(??) <= 2 AND ?? ${sinal}))`,
      [`piv.${tabela}`, `${tabela}_${coluna}_pontos_check`, coluna, coluna, coluna, coluna]);
  }
  await alterarFks(db, "RESTRICT");
  await db.raw(`
    ALTER TABLE piv.regra_pontuacao
      ADD CONSTRAINT regra_pontuacao_origem_check CHECK (origem IN ('CONFIGURADA','HISTORICA')),
      ADD CONSTRAINT regra_pontuacao_versao_check CHECK (versao > 0),
      ADD CONSTRAINT regra_pontuacao_autoria_check CHECK
        (origem = 'HISTORICA' OR (criada_por_usuario_id IS NOT NULL AND atualizada_por_usuario_id IS NOT NULL));
    ALTER TABLE piv.subgrupo_avaliacao
      ADD CONSTRAINT subgrupo_nome_check CHECK (length(btrim(nome)) > 0),
      ADD CONSTRAINT subgrupo_ordem_check CHECK (ordem >= 0),
      ADD CONSTRAINT subgrupo_quantidade_check CHECK
        ((modo_quantidade='FIXA' AND quantidade_fixa IS NOT NULL AND quantidade_fixa > 0)
        OR (modo_quantidade='SEM_LIMITE' AND quantidade_fixa IS NULL));
    ALTER TABLE piv.regra_pontuacao_auditoria
      ADD CONSTRAINT regra_auditoria_acao_check CHECK (acao IN ('CRIACAO','ALTERACAO','PRIMEIRO_USO','ADOCAO_HISTORICA')),
      ADD CONSTRAINT regra_auditoria_autoria_check CHECK (acao='ADOCAO_HISTORICA' OR usuario_id IS NOT NULL);
    ALTER TABLE piv.turma_disciplina ADD CONSTRAINT oferta_marcadores_check CHECK
      ((regra_pontuacao_id IS NULL) = (pontuacao_vinculada_em IS NULL));

    CREATE FUNCTION piv.pontuacao_exige_isolamento_escrita() RETURNS void LANGUAGE plpgsql AS $fn$
    BEGIN
      -- Um mutex sem nova versão não atualiza snapshots de REPEATABLE READ.
      -- A releitura dos agregados usa o contrato de escrita READ COMMITTED.
      IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'ISOLAMENTO_ESCRITA_INVALIDO' USING ERRCODE='23514';
      END IF;
    END $fn$;

    CREATE FUNCTION piv.pontuacao_guard_regra() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF TG_OP='DELETE' THEN
        IF OLD.usada_em IS NOT NULL THEN RAISE EXCEPTION 'REGRA_PRESERVADA' USING ERRCODE='23514'; END IF;
        RETURN OLD;
      END IF;
      IF TG_OP='UPDATE' THEN
        IF ROW(NEW.id,NEW.curso_id,NEW.periodo_letivo_id,NEW.origem,NEW.criada_por_usuario_id,NEW.created_at)
          IS DISTINCT FROM ROW(OLD.id,OLD.curso_id,OLD.periodo_letivo_id,OLD.origem,OLD.criada_por_usuario_id,OLD.created_at)
          OR (OLD.usada_em IS NOT NULL AND (NEW.usada_em IS DISTINCT FROM OLD.usada_em
            OR NEW.total_pontos IS DISTINCT FROM OLD.total_pontos OR NEW.versao IS DISTINCT FROM OLD.versao)) THEN
          RAISE EXCEPTION 'REGRA_PRESERVADA' USING ERRCODE='23514';
        END IF;
      END IF;
      RETURN NEW;
    END $fn$;
    CREATE TRIGGER pontuacao_guard_regra BEFORE UPDATE OR DELETE ON piv.regra_pontuacao
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_regra();

    CREATE FUNCTION piv.pontuacao_guard_subgrupo() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE chave uuid; momento timestamptz;
    BEGIN
      PERFORM piv.pontuacao_exige_isolamento_escrita();
      IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.regra_pontuacao_id IS DISTINCT FROM OLD.regra_pontuacao_id) THEN
        RAISE EXCEPTION 'SUBGRUPO_VINCULO_IMUTAVEL' USING ERRCODE='23514';
      END IF;
      chave := CASE WHEN TG_OP='DELETE' THEN OLD.regra_pontuacao_id ELSE NEW.regra_pontuacao_id END;
      SELECT usada_em INTO momento FROM piv.regra_pontuacao WHERE id=chave FOR UPDATE;
      IF momento IS NOT NULL THEN RAISE EXCEPTION 'REGRA_PRESERVADA' USING ERRCODE='23514'; END IF;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END $fn$;
    CREATE TRIGGER pontuacao_guard_subgrupo BEFORE INSERT OR UPDATE OR DELETE ON piv.subgrupo_avaliacao
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_subgrupo();

    CREATE FUNCTION piv.pontuacao_soma_regra() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE chave uuid; total numeric; soma numeric; quantidade bigint;
    BEGIN
      PERFORM piv.pontuacao_exige_isolamento_escrita();
      IF TG_TABLE_NAME='regra_pontuacao' THEN
        chave := CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
      ELSE
        chave := CASE WHEN TG_OP='DELETE' THEN OLD.regra_pontuacao_id ELSE NEW.regra_pontuacao_id END;
      END IF;
      SELECT total_pontos INTO total FROM piv.regra_pontuacao WHERE id=chave FOR UPDATE;
      IF NOT FOUND THEN RETURN NULL; END IF;
      SELECT sum(orcamento_pontos),count(*) INTO soma,quantidade FROM piv.subgrupo_avaliacao WHERE regra_pontuacao_id=chave;
      IF quantidade=0 OR soma IS DISTINCT FROM total THEN RAISE EXCEPTION 'SOMA_SUBGRUPOS_INVALIDA' USING ERRCODE='23514'; END IF;
      RETURN NULL;
    END $fn$;
    CREATE CONSTRAINT TRIGGER pontuacao_soma_regra AFTER INSERT OR UPDATE ON piv.regra_pontuacao
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_soma_regra();
    CREATE CONSTRAINT TRIGGER pontuacao_soma_subgrupo AFTER INSERT OR UPDATE OR DELETE ON piv.subgrupo_avaliacao
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_soma_regra();

    CREATE FUNCTION piv.pontuacao_guard_oferta() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE curso uuid; periodo uuid; curso_matriz uuid; regra piv.regra_pontuacao%ROWTYPE;
    BEGIN
      PERFORM piv.pontuacao_exige_isolamento_escrita();
      IF TG_OP='DELETE' THEN
        IF OLD.pontuacao_vinculada_em IS NOT NULL THEN RAISE EXCEPTION 'OFERTA_PRESERVADA' USING ERRCODE='23514'; END IF;
        RETURN OLD;
      END IF;
      IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR (OLD.pontuacao_vinculada_em IS NOT NULL AND
        ROW(NEW.turma_id,NEW.curso_disciplina_id,NEW.regra_pontuacao_id,NEW.pontuacao_vinculada_em)
          IS DISTINCT FROM ROW(OLD.turma_id,OLD.curso_disciplina_id,OLD.regra_pontuacao_id,OLD.pontuacao_vinculada_em))) THEN
        RAISE EXCEPTION 'OFERTA_PRESERVADA' USING ERRCODE='23514';
      END IF;
      SELECT curso_id,periodo_letivo_id INTO curso,periodo FROM piv.turma WHERE id=NEW.turma_id FOR SHARE;
      SELECT curso_id INTO curso_matriz FROM piv.curso_disciplina WHERE id=NEW.curso_disciplina_id FOR SHARE;
      IF curso IS DISTINCT FROM curso_matriz THEN RAISE EXCEPTION 'OFERTA_MATRIZ_INCOMPATIVEL' USING ERRCODE='23514'; END IF;
      IF NEW.regra_pontuacao_id IS NOT NULL THEN
        SELECT * INTO regra FROM piv.regra_pontuacao WHERE id=NEW.regra_pontuacao_id;
        IF NOT FOUND OR regra.curso_id IS DISTINCT FROM curso OR regra.periodo_letivo_id IS DISTINCT FROM periodo THEN
          RAISE EXCEPTION 'OFERTA_REGRA_INCOMPATIVEL' USING ERRCODE='23514';
        END IF;
        -- Não escrever na regra já preservada: lotes em ofertas distintas não a serializam.
        IF regra.usada_em IS NULL THEN
          UPDATE piv.regra_pontuacao SET usada_em=NEW.pontuacao_vinculada_em WHERE id=regra.id AND usada_em IS NULL;
        END IF;
      END IF;
      RETURN NEW;
    END $fn$;
    CREATE TRIGGER pontuacao_guard_oferta BEFORE INSERT OR UPDATE OR DELETE ON piv.turma_disciplina
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_oferta();

    CREATE FUNCTION piv.pontuacao_guard_avaliacao() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE alvo uuid; oferta piv.turma_disciplina%ROWTYPE; turma piv.turma%ROWTYPE;
      periodo piv.periodo_letivo%ROWTYPE; regra piv.regra_pontuacao%ROWTYPE;
      subgrupo piv.subgrupo_avaliacao%ROWTYPE; soma numeric; quantidade bigint; estrutural boolean;
      matriz_descoberta uuid; turma_descoberta uuid; curso_descoberto uuid; periodo_descoberto uuid;
    BEGIN
      PERFORM piv.pontuacao_exige_isolamento_escrita();
      IF TG_OP='UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR (OLD.primeira_nota_em IS NOT NULL AND NEW.primeira_nota_em IS DISTINCT FROM OLD.primeira_nota_em) THEN
          RAISE EXCEPTION 'AVALIACAO_MARCADOR_IMUTAVEL' USING ERRCODE='23514';
        END IF;
        estrutural := ROW(NEW.valor,NEW.subgrupo_id,NEW.turma_disciplina_id,NEW.tipo_avaliacao)
          IS DISTINCT FROM ROW(OLD.valor,OLD.subgrupo_id,OLD.turma_disciplina_id,OLD.tipo_avaliacao);
        IF OLD.primeira_nota_em IS NOT NULL AND estrutural THEN
          RAISE EXCEPTION 'AVALIACAO_PRESERVADA' USING ERRCODE='23514';
        END IF;
        -- O guard da nota só altera o marcador, após validar período/vínculos/faixa.
        IF NOT estrutural AND NEW.descricao_avaliacao IS NOT DISTINCT FROM OLD.descricao_avaliacao
          AND NEW.data_lancamento IS NOT DISTINCT FROM OLD.data_lancamento AND NEW.data_devolucao IS NOT DISTINCT FROM OLD.data_devolucao THEN
          RETURN NEW;
        END IF;
      ELSE
        estrutural := true;
      END IF;
      IF TG_OP='DELETE' AND OLD.primeira_nota_em IS NOT NULL THEN
        RAISE EXCEPTION 'AVALIACAO_PRESERVADA' USING ERRCODE='23514';
      END IF;
      -- Verificar os dois períodos antes de liberar movimento de uma oferta encerrada.
      FOR alvo IN SELECT DISTINCT id FROM unnest(CASE WHEN TG_OP='UPDATE'
        THEN ARRAY[OLD.turma_disciplina_id,NEW.turma_disciplina_id]
        WHEN TG_OP='DELETE' THEN ARRAY[OLD.turma_disciplina_id] ELSE ARRAY[NEW.turma_disciplina_id] END) id ORDER BY id LOOP
        SELECT * INTO oferta FROM piv.turma_disciplina WHERE id=alvo;
        SELECT * INTO turma FROM piv.turma WHERE id=oferta.turma_id FOR SHARE;
        SELECT * INTO periodo FROM piv.periodo_letivo WHERE id=turma.periodo_letivo_id FOR SHARE;
        PERFORM id FROM piv.curso_disciplina WHERE id=oferta.curso_disciplina_id FOR SHARE;
        IF NOT periodo.ativo OR lower(periodo.status) IN ('fechado','encerrado','concluido','inativo') THEN
          RAISE EXCEPTION 'PERIODO_ENCERRADO' USING ERRCODE='23514';
        END IF;
        IF lower(oferta.status) <> 'ativa' OR lower(turma.status) <> 'ativa' THEN
          RAISE EXCEPTION 'OFERTA_INATIVA' USING ERRCODE='23514';
        END IF;
        IF TG_OP<>'DELETE' AND alvo=NEW.turma_disciplina_id THEN
          matriz_descoberta := oferta.curso_disciplina_id; turma_descoberta := oferta.turma_id;
          curso_descoberto := turma.curso_id; periodo_descoberto := turma.periodo_letivo_id;
        END IF;
      END LOOP;
      IF TG_OP='DELETE' THEN RETURN OLD; END IF;
      SELECT * INTO oferta FROM piv.turma_disciplina WHERE id=NEW.turma_disciplina_id;
      SELECT * INTO turma FROM piv.turma WHERE id=oferta.turma_id;
      IF oferta.turma_id IS DISTINCT FROM turma_descoberta OR oferta.curso_disciplina_id IS DISTINCT FROM matriz_descoberta
        OR turma.curso_id IS DISTINCT FROM curso_descoberto OR turma.periodo_letivo_id IS DISTINCT FROM periodo_descoberto THEN
        RAISE EXCEPTION 'VINCULOS_ALTERADOS' USING ERRCODE='40001';
      END IF;
      IF estrutural THEN
        SELECT * INTO regra FROM piv.regra_pontuacao WHERE curso_id=turma.curso_id AND periodo_letivo_id=turma.periodo_letivo_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'REGRA_AUSENTE' USING ERRCODE='23514'; END IF;
        SELECT * INTO oferta FROM piv.turma_disciplina WHERE id=oferta.id FOR UPDATE;
        SELECT * INTO turma FROM piv.turma WHERE id=oferta.turma_id;
        IF oferta.turma_id IS DISTINCT FROM turma_descoberta OR oferta.curso_disciplina_id IS DISTINCT FROM matriz_descoberta
          OR turma.curso_id IS DISTINCT FROM curso_descoberto OR turma.periodo_letivo_id IS DISTINCT FROM periodo_descoberto THEN
          RAISE EXCEPTION 'VINCULOS_ALTERADOS' USING ERRCODE='40001';
        END IF;
        IF lower(oferta.status)<>'ativa' OR lower(turma.status)<>'ativa' THEN
          RAISE EXCEPTION 'OFERTA_INATIVA' USING ERRCODE='23514';
        END IF;
      ELSE
        SELECT * INTO regra FROM piv.regra_pontuacao WHERE id=oferta.regra_pontuacao_id;
      END IF;
      IF NEW.tipo_avaliacao='RECUPERACAO' THEN
        IF NEW.subgrupo_id IS NOT NULL OR NEW.valor IS DISTINCT FROM regra.total_pontos THEN
          RAISE EXCEPTION 'RECUPERACAO_MAXIMO_INVALIDO' USING ERRCODE='23514';
        END IF;
      ELSE
        SELECT * INTO subgrupo FROM piv.subgrupo_avaliacao WHERE id=NEW.subgrupo_id;
        IF NOT FOUND OR subgrupo.regra_pontuacao_id IS DISTINCT FROM regra.id THEN
          RAISE EXCEPTION 'SUBGRUPO_INCOMPATIVEL' USING ERRCODE='23514';
        END IF;
        SELECT coalesce(sum(valor),0),count(*) INTO soma,quantidade FROM piv.avaliacao
          WHERE turma_disciplina_id=oferta.id AND subgrupo_id=NEW.subgrupo_id AND id<>NEW.id AND tipo_avaliacao<>'RECUPERACAO';
        IF soma+NEW.valor > subgrupo.orcamento_pontos OR
          (subgrupo.modo_quantidade='FIXA' AND quantidade+1 > subgrupo.quantidade_fixa) THEN
          RAISE EXCEPTION 'LIMITE_SUBGRUPO_EXCEDIDO' USING ERRCODE='23514';
        END IF;
      END IF;
      IF oferta.regra_pontuacao_id IS NULL THEN
        UPDATE piv.regra_pontuacao SET usada_em=coalesce(usada_em,clock_timestamp()) WHERE id=regra.id AND usada_em IS NULL;
        UPDATE piv.turma_disciplina SET regra_pontuacao_id=regra.id,pontuacao_vinculada_em=clock_timestamp() WHERE id=oferta.id;
      ELSIF oferta.regra_pontuacao_id IS DISTINCT FROM regra.id THEN
        RAISE EXCEPTION 'OFERTA_REGRA_INCOMPATIVEL' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $fn$;
    CREATE TRIGGER pontuacao_guard_avaliacao BEFORE INSERT OR UPDATE OR DELETE ON piv.avaliacao
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_avaliacao();

    CREATE FUNCTION piv.pontuacao_guard_nota() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE avaliacao piv.avaliacao%ROWTYPE; vinculo piv.matricula_turma_disciplina%ROWTYPE;
      matricula piv.matricula%ROWTYPE; oferta piv.turma_disciplina%ROWTYPE; turma piv.turma%ROWTYPE;
      periodo piv.periodo_letivo%ROWTYPE; total numeric; regular numeric;
      matriz_descoberta uuid; turma_descoberta uuid; matricula_descoberta uuid; periodo_descoberto uuid;
    BEGIN
      PERFORM piv.pontuacao_exige_isolamento_escrita();
      IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.avaliacao_id,NEW.matricula_turma_disciplina_id,NEW.publicada_em,NEW.criada_por_usuario_id,NEW.created_at)
        IS DISTINCT FROM ROW(OLD.id,OLD.avaliacao_id,OLD.matricula_turma_disciplina_id,OLD.publicada_em,OLD.criada_por_usuario_id,OLD.created_at) THEN
        RAISE EXCEPTION 'NOTA_VINCULO_IMUTAVEL' USING ERRCODE='23514';
      END IF;
      SELECT * INTO avaliacao FROM piv.avaliacao WHERE id=NEW.avaliacao_id;
      SELECT * INTO oferta FROM piv.turma_disciplina WHERE id=avaliacao.turma_disciplina_id;
      matriz_descoberta := oferta.curso_disciplina_id; turma_descoberta := oferta.turma_id;
      SELECT * INTO turma FROM piv.turma WHERE id=oferta.turma_id;
      periodo_descoberto := turma.periodo_letivo_id;
      SELECT * INTO periodo FROM piv.periodo_letivo WHERE id=turma.periodo_letivo_id FOR SHARE;
      SELECT * INTO turma FROM piv.turma WHERE id=oferta.turma_id FOR SHARE;
      IF turma.periodo_letivo_id IS DISTINCT FROM periodo_descoberto THEN
        RAISE EXCEPTION 'VINCULOS_ALTERADOS' USING ERRCODE='40001';
      END IF;
      PERFORM id FROM piv.curso_disciplina WHERE id=oferta.curso_disciplina_id FOR SHARE;
      SELECT * INTO oferta FROM piv.turma_disciplina WHERE id=oferta.id FOR UPDATE;
      SELECT * INTO avaliacao FROM piv.avaliacao WHERE id=NEW.avaliacao_id FOR UPDATE;
      IF oferta.turma_id IS DISTINCT FROM turma_descoberta OR oferta.curso_disciplina_id IS DISTINCT FROM matriz_descoberta
        OR avaliacao.turma_disciplina_id IS DISTINCT FROM oferta.id THEN
        RAISE EXCEPTION 'VINCULOS_ALTERADOS' USING ERRCODE='40001';
      END IF;
      SELECT * INTO vinculo FROM piv.matricula_turma_disciplina WHERE id=NEW.matricula_turma_disciplina_id;
      matricula_descoberta := vinculo.matricula_id;
      SELECT * INTO matricula FROM piv.matricula WHERE id=vinculo.matricula_id FOR SHARE;
      SELECT * INTO vinculo FROM piv.matricula_turma_disciplina WHERE id=NEW.matricula_turma_disciplina_id FOR UPDATE;
      IF vinculo.matricula_id IS DISTINCT FROM matricula_descoberta THEN
        RAISE EXCEPTION 'VINCULOS_ALTERADOS' USING ERRCODE='40001';
      END IF;
      IF avaliacao.id IS NULL OR vinculo.id IS NULL OR vinculo.turma_disciplina_id IS DISTINCT FROM avaliacao.turma_disciplina_id
        OR lower(vinculo.status)<>'ativa' OR lower(matricula.status) NOT IN ('ativa','pendente') THEN
        RAISE EXCEPTION 'NOTA_MATRICULA_INCOMPATIVEL' USING ERRCODE='23514';
      END IF;
      IF NOT periodo.ativo OR lower(periodo.status) IN ('fechado','encerrado','concluido','inativo') THEN
        RAISE EXCEPTION 'PERIODO_ENCERRADO' USING ERRCODE='23514';
      END IF;
      IF NEW.valor > avaliacao.valor THEN RAISE EXCEPTION 'NOTA_ACIMA_MAXIMO' USING ERRCODE='23514'; END IF;
      IF avaliacao.tipo_avaliacao='RECUPERACAO' THEN
        SELECT total_pontos INTO total FROM piv.regra_pontuacao WHERE id=oferta.regra_pontuacao_id;
        IF EXISTS (SELECT 1 FROM piv.subgrupo_avaliacao s LEFT JOIN LATERAL (
          SELECT coalesce(sum(a.valor),0) soma,count(*) quantidade FROM piv.avaliacao a
          WHERE a.turma_disciplina_id=oferta.id AND a.subgrupo_id=s.id AND a.tipo_avaliacao<>'RECUPERACAO'
        ) plano ON true WHERE s.regra_pontuacao_id=oferta.regra_pontuacao_id
          AND (plano.soma<>s.orcamento_pontos OR (s.modo_quantidade='FIXA' AND plano.quantidade<>s.quantidade_fixa)))
          OR EXISTS (SELECT 1 FROM piv.avaliacao a WHERE a.turma_disciplina_id=oferta.id AND a.tipo_avaliacao<>'RECUPERACAO'
            AND NOT EXISTS (SELECT 1 FROM piv.nota n WHERE n.avaliacao_id=a.id AND n.matricula_turma_disciplina_id=vinculo.id)) THEN
          RAISE EXCEPTION 'ETAPA_REGULAR_INCOMPLETA' USING ERRCODE='23514';
        END IF;
        SELECT coalesce(sum(n.valor),0) INTO regular FROM piv.nota n JOIN piv.avaliacao a ON a.id=n.avaliacao_id
          WHERE n.matricula_turma_disciplina_id=vinculo.id AND a.turma_disciplina_id=oferta.id AND a.tipo_avaliacao<>'RECUPERACAO';
        IF 5*regular >= 3*total THEN RAISE EXCEPTION 'RECUPERACAO_INELEGIVEL' USING ERRCODE='23514'; END IF;
      END IF;
      IF avaliacao.primeira_nota_em IS NULL THEN
        UPDATE piv.avaliacao a SET primeira_nota_em=clock_timestamp() WHERE a.id=avaliacao.id AND a.primeira_nota_em IS NULL;
      END IF;
      RETURN NEW;
    END $fn$;
    CREATE TRIGGER pontuacao_guard_nota BEFORE INSERT OR UPDATE ON piv.nota
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_nota();

    CREATE FUNCTION piv.pontuacao_preserva_nota() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN RAISE EXCEPTION 'NOTA_PRESERVADA' USING ERRCODE='23514'; END $fn$;
    CREATE TRIGGER pontuacao_preserva_nota BEFORE DELETE ON piv.nota
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_preserva_nota();

    CREATE FUNCTION piv.pontuacao_guard_pais() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      PERFORM piv.pontuacao_exige_isolamento_escrita();
      IF TG_TABLE_NAME='turma' THEN
        IF ROW(NEW.id,NEW.curso_id,NEW.periodo_letivo_id) IS DISTINCT FROM ROW(OLD.id,OLD.curso_id,OLD.periodo_letivo_id)
          AND EXISTS (SELECT 1 FROM piv.turma_disciplina WHERE turma_id=OLD.id AND pontuacao_vinculada_em IS NOT NULL) THEN
          RAISE EXCEPTION 'TURMA_PRESERVADA' USING ERRCODE='23514';
        END IF;
      ELSIF TG_TABLE_NAME='curso_disciplina' THEN
        IF ROW(NEW.id,NEW.curso_id,NEW.disciplina_id) IS DISTINCT FROM ROW(OLD.id,OLD.curso_id,OLD.disciplina_id)
          AND EXISTS (SELECT 1 FROM piv.turma_disciplina WHERE curso_disciplina_id=OLD.id AND pontuacao_vinculada_em IS NOT NULL) THEN
          RAISE EXCEPTION 'MATRIZ_PRESERVADA' USING ERRCODE='23514';
        END IF;
      ELSIF TG_TABLE_NAME='matricula_turma_disciplina' THEN
        IF ROW(NEW.id,NEW.matricula_id,NEW.turma_disciplina_id) IS DISTINCT FROM ROW(OLD.id,OLD.matricula_id,OLD.turma_disciplina_id)
          AND EXISTS (SELECT 1 FROM piv.nota WHERE matricula_turma_disciplina_id=OLD.id) THEN
          RAISE EXCEPTION 'MATRICULA_DISCIPLINA_PRESERVADA' USING ERRCODE='23514';
        END IF;
      ELSIF TG_TABLE_NAME='matricula' THEN
        IF ROW(NEW.id,NEW.aluno_id,NEW.curso_id,NEW.turma_id) IS DISTINCT FROM ROW(OLD.id,OLD.aluno_id,OLD.curso_id,OLD.turma_id)
          AND EXISTS (SELECT 1 FROM piv.nota n JOIN piv.matricula_turma_disciplina m ON m.id=n.matricula_turma_disciplina_id WHERE m.matricula_id=OLD.id) THEN
          RAISE EXCEPTION 'MATRICULA_PRESERVADA' USING ERRCODE='23514';
        END IF;
      END IF;
      RETURN NEW;
    END $fn$;
    CREATE TRIGGER pontuacao_guard_pais BEFORE UPDATE ON piv.turma FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_pais();
    CREATE TRIGGER pontuacao_guard_pais BEFORE UPDATE ON piv.curso_disciplina FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_pais();
    CREATE TRIGGER pontuacao_guard_pais BEFORE UPDATE ON piv.matricula_turma_disciplina FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_pais();
    CREATE TRIGGER pontuacao_guard_pais BEFORE UPDATE ON piv.matricula FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_pais();

    CREATE FUNCTION piv.pontuacao_guard_auditoria() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN RAISE EXCEPTION 'AUDITORIA_IMUTAVEL' USING ERRCODE='23514'; END $fn$;
    CREATE TRIGGER pontuacao_guard_auditoria BEFORE UPDATE OR DELETE ON piv.nota_auditoria
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_auditoria();
    CREATE TRIGGER pontuacao_guard_auditoria_truncate BEFORE TRUNCATE ON piv.nota_auditoria
      FOR EACH STATEMENT EXECUTE FUNCTION piv.pontuacao_guard_auditoria();
    CREATE TRIGGER pontuacao_guard_auditoria BEFORE UPDATE OR DELETE ON piv.regra_pontuacao_auditoria
      FOR EACH ROW EXECUTE FUNCTION piv.pontuacao_guard_auditoria();
    CREATE TRIGGER pontuacao_guard_auditoria_truncate BEFORE TRUNCATE ON piv.regra_pontuacao_auditoria
      FOR EACH STATEMENT EXECUTE FUNCTION piv.pontuacao_guard_auditoria();
  `);
}

export async function down(db: Knex): Promise<void> {
  await bloquearRetornoPontuacao(db);
  // Nenhum registro é removido. O retorno da adoção técnica é outra migration.
  await db.raw(`
    DROP TRIGGER pontuacao_guard_auditoria ON piv.nota_auditoria;
    DROP TRIGGER pontuacao_guard_auditoria_truncate ON piv.nota_auditoria;
    DROP TRIGGER pontuacao_guard_auditoria ON piv.regra_pontuacao_auditoria;
    DROP TRIGGER pontuacao_guard_auditoria_truncate ON piv.regra_pontuacao_auditoria;
    DROP TRIGGER pontuacao_guard_pais ON piv.turma;
    DROP TRIGGER pontuacao_guard_pais ON piv.curso_disciplina;
    DROP TRIGGER pontuacao_guard_pais ON piv.matricula_turma_disciplina;
    DROP TRIGGER pontuacao_guard_pais ON piv.matricula;
    DROP TRIGGER pontuacao_guard_nota ON piv.nota;
    DROP TRIGGER pontuacao_preserva_nota ON piv.nota;
    DROP TRIGGER pontuacao_guard_avaliacao ON piv.avaliacao;
    DROP TRIGGER pontuacao_guard_oferta ON piv.turma_disciplina;
    DROP TRIGGER pontuacao_soma_subgrupo ON piv.subgrupo_avaliacao;
    DROP TRIGGER pontuacao_soma_regra ON piv.regra_pontuacao;
    DROP TRIGGER pontuacao_guard_subgrupo ON piv.subgrupo_avaliacao;
    DROP TRIGGER pontuacao_guard_regra ON piv.regra_pontuacao;
    DROP FUNCTION piv.pontuacao_guard_auditoria(), piv.pontuacao_guard_pais(), piv.pontuacao_guard_nota(),
      piv.pontuacao_guard_avaliacao(), piv.pontuacao_guard_oferta(), piv.pontuacao_soma_regra(),
      piv.pontuacao_guard_subgrupo(), piv.pontuacao_guard_regra(), piv.pontuacao_preserva_nota(),
      piv.pontuacao_exige_isolamento_escrita();
    ALTER TABLE piv.turma_disciplina DROP CONSTRAINT oferta_marcadores_check;
    ALTER TABLE piv.regra_pontuacao_auditoria DROP CONSTRAINT regra_auditoria_acao_check, DROP CONSTRAINT regra_auditoria_autoria_check;
    ALTER TABLE piv.subgrupo_avaliacao DROP CONSTRAINT subgrupo_nome_check, DROP CONSTRAINT subgrupo_ordem_check, DROP CONSTRAINT subgrupo_quantidade_check;
    ALTER TABLE piv.regra_pontuacao DROP CONSTRAINT regra_pontuacao_origem_check, DROP CONSTRAINT regra_pontuacao_versao_check, DROP CONSTRAINT regra_pontuacao_autoria_check;
  `);
  for (const [tabela, coluna] of pontos) {
    await db.raw("ALTER TABLE ?? DROP CONSTRAINT ??", [`piv.${tabela}`, `${tabela}_${coluna}_pontos_check`]);
  }
  await alterarFks(db, "CASCADE");
}
