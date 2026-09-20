import { DocumentoRepository, CriarDocumentoDTO, Documento, DocumentoComAluno, InscritoComDocumentos, TIPOS_DOCUMENTO } from "../repository/DocumentoRepository";
import { MatriculaService } from "../../modulo-matricula/service/MatriculaService";
import { notificacaoService } from "../../configuracao-email/service/NotificacaoService";
import { db } from "../../../database/connection";

const STATUS_VALIDOS = ["PENDENTE", "APROVADO", "REPROVADO"];

const ESPERA_AVISO_REPROVACAO_MS = 8000;

const ROTULO_DOCUMENTO: Record<string, string> = {
    RG: "RG (Registro Geral)",
    CPF: "CPF",
    HISTORICO: "Histórico Escolar do Ensino Médio",
    COMPROVANTE_RESIDENCIA: "Comprovante de Residência",
    NOTAS_ENEM: "Boletim de Desempenho do ENEM",
    COMPROVANTE_INSCRICAO_ENEM: "Comprovante de Inscrição no ENEM",
    OUTROS: "Outros documentos",
};

export class DocumentoService {
    private static avisosDeReprovacao = new Map<string, NodeJS.Timeout>();

    private repository = new DocumentoRepository();
    private matriculaService = new MatriculaService();

    async criar(dados: CriarDocumentoDTO): Promise<Documento> {
        if (!TIPOS_DOCUMENTO.includes(dados.tipo_documento as any)) {
            throw new Error(`Tipo inválido. Use: ${TIPOS_DOCUMENTO.join(", ")}.`);
        }
        return this.repository.criar(dados);
    }

    async listarTodos(): Promise<DocumentoComAluno[]> {
        return this.repository.listarTodos();
    }

    async listarPorAluno(alunoId: string): Promise<Documento[]> {
        return this.repository.listarPorAluno(alunoId);
    }

    async buscarPorId(id: string): Promise<Documento> {
        const doc = await this.repository.buscarPorId(id);
        if (!doc) throw new Error(`Documento ${id} não encontrado.`);
        return doc;
    }

    async validar(id: string, status: string, observacao?: string): Promise<Documento> {
        if (!STATUS_VALIDOS.includes(status)) {
            throw new Error(`Status inválido. Use: ${STATUS_VALIDOS.join(", ")}.`);
        }
        const doc = await this.repository.buscarPorId(id);
        if (!doc) throw new Error(`Documento ${id} não encontrado.`);

        const documento = (await this.repository.validar(id, status, observacao))!;

        await this.aposValidacao(doc.aluno_id, status);

        return documento;
    }

    async validarTodosDoAluno(alunoId: string, status: string, observacao?: string): Promise<number> {
        if (!STATUS_VALIDOS.includes(status)) {
            throw new Error(`Status inválido. Use: ${STATUS_VALIDOS.join(", ")}.`);
        }

        const enviados = await this.repository.listarPorAluno(alunoId);

        if (enviados.length === 0) {
            throw new Error("Este aluno ainda não enviou nenhum documento.");
        }

        const alterados = await this.repository.validarDoAluno(alunoId, status, observacao);

        await this.aposValidacao(alunoId, status);

        return alterados.length;
    }

    private async aposValidacao(alunoId: string, status: string): Promise<void> {
        try {
            await this.executarEfeitosDaValidacao(alunoId, status);
        } catch (erro) {
            console.error("[documentos] falha nos efeitos da validação:", erro);
        }
    }

    private async executarEfeitosDaValidacao(alunoId: string, status: string): Promise<void> {
        if (status === "REPROVADO") {
            this.agendarAvisoDeReprovacao(alunoId);
            return;
        }

        if (status !== "APROVADO") return;

        const pendentes = await this.repository.contarDocumentosPendentesOuReprovados(alunoId);
        if (pendentes > 0) return;

        const matricula = await this.matriculaService
            .matricularAutomaticamente(alunoId)
            .catch((erro) => {
                console.error("[documentos] falha ao matricular automaticamente:", erro);
                return null;
            });

        if (!matricula) {
            console.warn(
                `[documentos] documentação do aluno ${alunoId} está aprovada, mas nenhuma turma do período dele ` +
                    "está disponível. O acesso ao portal continua bloqueado até a secretaria criar a matrícula.",
            );
            return;
        }

        await this.liberarAcessoDoAluno(alunoId).catch((erro) =>
            console.error("[documentos] falha ao liberar o acesso do aluno:", erro),
        );

        await this.avisarDocumentacaoAprovada(alunoId).catch((erro) =>
            console.error("[documentos] falha ao avisar a documentação aprovada:", erro),
        );
    }

    private agendarAvisoDeReprovacao(alunoId: string): void {
        const agendado = DocumentoService.avisosDeReprovacao.get(alunoId);
        if (agendado) clearTimeout(agendado);

        const temporizador = setTimeout(() => {
            DocumentoService.avisosDeReprovacao.delete(alunoId);

            void this.avisarDocumentacaoReprovada(alunoId).catch((erro) =>
                console.error("[documentos] falha ao avisar a documentação reprovada:", erro),
            );
        }, ESPERA_AVISO_REPROVACAO_MS);

        temporizador.unref?.();
        DocumentoService.avisosDeReprovacao.set(alunoId, temporizador);
    }

    private async avisarDocumentacaoReprovada(alunoId: string): Promise<void> {
        const reprovados = await this.repository.listarReprovadosDoAluno(alunoId);
        if (reprovados.length === 0) return;

        const aluno = await this.repository.buscarContatoDoAluno(alunoId);
        if (!aluno?.email) return;

        await notificacaoService.notificarDocumentacaoReprovada({
            email: aluno.email,
            nome: aluno.nome,
            alunoId,
            matricula: aluno.matricula,
            recusados: reprovados.map((doc) => ({
                rotulo: ROTULO_DOCUMENTO[doc.tipo_documento] ?? doc.tipo_documento,
                motivo: doc.observacao ?? "",
            })),
        });
    }

    private async liberarAcessoDoAluno(alunoId: string): Promise<void> {
        const aluno = await db("aluno").where({ id: alunoId }).first();
        if (!aluno?.usuario_id) return;

        await db("usuario").where({ id: aluno.usuario_id }).update({ acesso_liberado: true });
    }

    private async avisarDocumentacaoAprovada(alunoId: string): Promise<void> {
        const aluno = await this.repository.buscarContatoDoAluno(alunoId);
        if (!aluno?.email) return;

        await notificacaoService.notificarDocumentacaoAprovada({
            email: aluno.email,
            nome: aluno.nome,
            matricula: aluno.matricula,
            curso: aluno.curso_nome,
        });
    }

    async listarInscritos(): Promise<InscritoComDocumentos[]> {
        return this.repository.listarInscritos();
    }

    async deletar(id: string): Promise<void> {
        const doc = await this.repository.buscarPorId(id);
        if (!doc) throw new Error(`Documento ${id} não encontrado.`);
        await this.repository.deletar(id);
    }
}
