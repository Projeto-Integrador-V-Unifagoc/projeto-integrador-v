import express from 'express';
import cors from 'cors';
import { db, setupDatabase } from './database';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
    origin: '*',
}))

app.use(express.json());

type SituacaoMatricula = 'SEM_MATRICULA' | 'MATRICULADO' | 'TRANCADO' | 'CANCELADO';

type Matricula = {
    id: number;
    alunoId: number;
    alunoNome?: string | null;
    periodoLetivo: string;
    disciplinas: string[];
    situacao: Exclude<SituacaoMatricula, 'SEM_MATRICULA'>;
    createdAt: string;
};

type MatriculaRow = {
    id: number;
    aluno_id: number;
    aluno_nome: string | null;
    periodo_letivo: string;
    disciplinas: string[];
    situacao: Exclude<SituacaoMatricula, 'SEM_MATRICULA'>;
    created_at: string;
};

const labelsSituacao: Record<Exclude<SituacaoMatricula, 'SEM_MATRICULA'>, string> = {
    MATRICULADO: 'Matriculado',
    TRANCADO: 'Trancado',
    CANCELADO: 'Cancelado',
};

const coresSituacao: Record<Exclude<SituacaoMatricula, 'SEM_MATRICULA'>, string> = {
    MATRICULADO: '#05b5e6',
    TRANCADO: '#f59e0b',
    CANCELADO: '#ef4444',
};

function formatarMatriculaComStatus(matricula: Matricula) {
    return {
        ...matricula,
        statusMatriculaLabel: labelsSituacao[matricula.situacao],
        statusMatriculaCor: coresSituacao[matricula.situacao],
    };
}

function mapearMatricula(row: MatriculaRow): Matricula {
    return {
        id: row.id,
        alunoId: row.aluno_id,
        alunoNome: row.aluno_nome,
        periodoLetivo: row.periodo_letivo,
        disciplinas: row.disciplinas,
        situacao: row.situacao,
        createdAt: row.created_at,
    };
}

app.get('/health', (_, response) => {
    return response.status(200).json({ status: 'ok' });
});

app.get('/matriculas', async (_, response) => {
    const result = await db.query(`
        SELECT id, aluno_id, aluno_nome, periodo_letivo, disciplinas, situacao, created_at
        FROM matriculas
        ORDER BY id DESC
    `);

    const matriculas = result.rows as MatriculaRow[];
    return response.status(200).json(matriculas.map(mapearMatricula).map(formatarMatriculaComStatus));
});

app.get('/matriculas/aluno/:alunoId', async (request, response) => {
    const alunoId = Number(request.params.alunoId);

    const result = await db.query(`
        SELECT id, aluno_id, aluno_nome, periodo_letivo, disciplinas, situacao, created_at
        FROM matriculas
        WHERE aluno_id = $1
        ORDER BY id DESC
    `, [alunoId]);

    const matriculas = result.rows as MatriculaRow[];
    return response.status(200).json(matriculas.map(mapearMatricula).map(formatarMatriculaComStatus));
});

app.post('/matriculas', async (request, response) => {
    const {
        alunoId,
        alunoNome,
        periodoLetivo,
        disciplinas,
    } = request.body as Partial<Pick<Matricula, 'alunoId' | 'alunoNome' | 'periodoLetivo' | 'disciplinas'>>;

    if (!alunoId || !periodoLetivo || !disciplinas || disciplinas.length === 0) {
        return response.status(400).json({
            message: 'Campos obrigatorios: alunoId, periodoLetivo e disciplinas (minimo 1).',
        });
    }

    const jaMatriculadoNoPeriodo = await db.query(`
        SELECT id
        FROM matriculas
        WHERE aluno_id = $1 AND periodo_letivo = $2
    `, [alunoId, periodoLetivo]);

    if (jaMatriculadoNoPeriodo.rowCount && jaMatriculadoNoPeriodo.rowCount > 0) {
        return response.status(409).json({
            message: 'Aluno ja possui matricula neste periodo letivo.',
        });
    }

    const result = await db.query(`
        INSERT INTO matriculas (aluno_id, aluno_nome, periodo_letivo, disciplinas, situacao, created_at)
        VALUES ($1, $2, $3, $4::jsonb, 'MATRICULADO', NOW())
        RETURNING id, aluno_id, aluno_nome, periodo_letivo, disciplinas, situacao, created_at
    `, [alunoId, alunoNome ?? null, periodoLetivo, JSON.stringify(disciplinas)]);

    const novaMatriculaRow = result.rows[0] as MatriculaRow;

    return response.status(201).json({
        matricula: formatarMatriculaComStatus(mapearMatricula(novaMatriculaRow)),
    });
});

app.patch('/matriculas/:id/situacao', async (request, response) => {
    const idMatricula = Number(request.params.id);
    const { situacao } = request.body as { situacao?: Exclude<SituacaoMatricula, 'SEM_MATRICULA'> };

    const matricula = await db.query(`
        SELECT id
        FROM matriculas
        WHERE id = $1
    `, [idMatricula]);

    if (!matricula.rowCount) {
        return response.status(404).json({ message: 'Matricula nao encontrada.' });
    }

    if (!situacao || !labelsSituacao[situacao]) {
        return response.status(400).json({
            message: 'Situacao invalida. Use: MATRICULADO, TRANCADO ou CANCELADO.',
        });
    }

    await db.query(`
        UPDATE matriculas
        SET situacao = $1
        WHERE id = $2
    `, [situacao, idMatricula]);

    const matriculaAtualizadaQuery = await db.query(`
        SELECT id, aluno_id, aluno_nome, periodo_letivo, disciplinas, situacao, created_at
        FROM matriculas
        WHERE id = $1
    `, [idMatricula]);
    const matriculaAtualizada = matriculaAtualizadaQuery.rows[0] as MatriculaRow;

    return response.status(200).json({
        message: 'Situacao atualizada com sucesso.',
        matricula: formatarMatriculaComStatus(mapearMatricula(matriculaAtualizada)),
    });
});
async function startServer() {
    try {
        await setupDatabase();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar servidor e conectar no PostgreSQL.', error);
        process.exit(1);
    }
}

startServer();