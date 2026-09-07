import { DocumentoRepository, CriarDocumentoDTO, Documento, DocumentoComAluno, InscritoComDocumentos, TIPOS_DOCUMENTO } from "../repository/DocumentoRepository";
import { MatriculaService } from "../../modulo-matricula/service/MatriculaService";

const STATUS_VALIDOS = ["PENDENTE", "APROVADO", "REPROVADO"];

export class DocumentoService {
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

        if (status === "APROVADO") {
            const pendentes = await this.repository.contarDocumentosPendentesOuReprovados(doc.aluno_id);
            if (pendentes === 0) {
                await this.matriculaService
                    .matricularAutomaticamente(doc.aluno_id)
                    .catch(() => null);
            }
        }

        return documento;
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
