import { v4 as uuidv4 } from "uuid";
import {
    type Disciplina,
    type DisciplinaCommand,
    type DisciplinaCompetenciaCommand,
    type NivelCompetencia,
} from "../models/Disciplina";
import { DisciplinaRepository } from "../repository/DisciplinaRepository";

const AREAS = new Set([
    "COMPUTACAO", "MATEMATICA", "CIENCIAS_HUMANAS", "ADMINISTRACAO_GESTAO",
    "COMUNICACAO", "CIENCIAS_NATUREZA", "FORMACAO_GERAL", "OUTRA",
]);
const NIVEIS = new Set<NivelCompetencia>(["INTRODUZIR", "DESENVOLVER", "CONSOLIDAR"]);
const CAMPOS_ACADEMICOS = [
    "areaConhecimento", "ementa", "cargaHorariaTeorica", "cargaHorariaPratica",
    "cargaHorariaLaboratorio", "cargaHorariaExtensao",
];

export class DisciplinaService {
    disciplinaRepository = new DisciplinaRepository();

    private traduzirErroRemocao(error: any) {
        const codigo = error?.code;
        const textoErro = [error?.constraint, error?.message, error?.detail].map((valor) => String(valor ?? "")).join(" ");

        if (textoErro.includes("professor_disciplina_disciplina_id_foreign")) {
            return "Nao e possivel remover a disciplina porque ela esta vinculada a professores.";
        }

        // curso_disciplina e removida em cascata, mas turma_disciplina bloqueia (RESTRICT).
        if (textoErro.includes("turma_disciplina_curso_disciplina_id_foreign")) {
            return "Nao e possivel remover a disciplina porque ela esta sendo usada em turmas.";
        }

        if (codigo === "23503" || textoErro.includes("violates RESTRICT setting of foreign key constraint")) {
            return "Nao e possivel remover a disciplina, pois ela possui registros vinculados.";
        }

        return null;
    }

    async criarDisciplina(data: any) {
        const codigo = this.textoObrigatorio(data.codigo, "Informe o codigo da disciplina").toUpperCase();
        if (await this.disciplinaRepository.buscarDisciplinaPorCodigo(codigo)) {
            throw new Error("Ja existe disciplina com este codigo");
        }

        const disciplina = this.comandoCompleto({ ...data, codigo }, true);
        const competencias = this.mapearCompetencias(data.competencias ?? []);
        await this.validarCompetencias(competencias);

        return this.disciplinaRepository.transacao(async (trx) => {
            const criada = await this.disciplinaRepository.criarDisciplina(disciplina, trx);
            await this.disciplinaRepository.substituirCompetencias(criada.id, competencias, trx);
            return {
                ...criada,
                competencias: await this.disciplinaRepository.listarCompetenciasDaDisciplina(criada.id, trx),
                cadastro_completo: true,
            };
        });
    }

    async listarDisciplinas() {
        const disciplinas = await this.disciplinaRepository.listarDisciplinas();
        return disciplinas.map((item) => ({ ...item, cadastro_completo: this.cadastroCompleto(item) }));
    }

    async buscarDisciplinaPorId(id: string) {
        const disciplina = await this.disciplinaRepository.buscarDisciplinaPorId(id);
        if (!disciplina) return null;
        return {
            ...disciplina,
            competencias: await this.disciplinaRepository.listarCompetenciasDaDisciplina(id),
            cadastro_completo: this.cadastroCompleto(disciplina),
        };
    }

    async atualizarDisciplina(id: string, data: any) {
        const atual = await this.disciplinaRepository.buscarDisciplinaPorId(id);
        if (!atual) return null;

        const codigo = data.codigo === undefined
            ? atual.codigo
            : this.textoObrigatorio(data.codigo, "Informe o codigo da disciplina").toUpperCase();
        if (codigo !== atual.codigo && await this.disciplinaRepository.buscarDisciplinaPorCodigo(codigo)) {
            throw new Error("Ja existe disciplina com este codigo");
        }

        const tocaAcademico = CAMPOS_ACADEMICOS.some((campo) => Object.prototype.hasOwnProperty.call(data, campo));
        const base = {
            codigo,
            nome: data.nome ?? atual.nome,
            cargaHoraria: data.cargaHoraria ?? atual.carga_horaria,
            preRequisito: data.preRequisito !== undefined ? data.preRequisito : atual.pre_requisito,
            areaConhecimento: data.areaConhecimento !== undefined ? data.areaConhecimento : atual.area_conhecimento,
            ementa: data.ementa !== undefined ? data.ementa : atual.ementa,
            cargaHorariaTeorica: data.cargaHorariaTeorica !== undefined ? data.cargaHorariaTeorica : atual.carga_horaria_teorica,
            cargaHorariaPratica: data.cargaHorariaPratica !== undefined ? data.cargaHorariaPratica : atual.carga_horaria_pratica,
            cargaHorariaLaboratorio: data.cargaHorariaLaboratorio !== undefined ? data.cargaHorariaLaboratorio : atual.carga_horaria_laboratorio,
            cargaHorariaExtensao: data.cargaHorariaExtensao !== undefined ? data.cargaHorariaExtensao : atual.carga_horaria_extensao,
            observacoes: data.observacoes !== undefined ? data.observacoes : atual.observacoes,
            ativo: data.ativo !== undefined ? data.ativo : atual.ativo,
        };
        const comando = this.comandoCompleto(base, tocaAcademico || this.cadastroCompleto(atual));
        const competenciasInformadas = Object.prototype.hasOwnProperty.call(data, "competencias");
        const competencias = competenciasInformadas ? this.mapearCompetencias(data.competencias ?? []) : null;
        if (competencias) await this.validarCompetencias(competencias);

        return this.disciplinaRepository.transacao(async (trx) => {
            const dadosAtualizacao: any = { ...comando, updated_at: new Date().toISOString() };
            delete dadosAtualizacao.id;
            const atualizada = await this.disciplinaRepository.atualizarDisciplina(
                id,
                dadosAtualizacao,
                trx,
            );
            if (competencias) await this.disciplinaRepository.substituirCompetencias(id, competencias, trx);
            return {
                ...atualizada,
                competencias: await this.disciplinaRepository.listarCompetenciasDaDisciplina(id, trx),
                cadastro_completo: this.cadastroCompleto(atualizada),
            };
        });
    }

    async removerDisciplina(id: string) {
        if (await this.disciplinaRepository.possuiVinculos(id)) {
            const erro = new Error("Disciplina possui vinculos academicos; desative-a em vez de excluir");
            (erro as any).status = 409;
            throw erro;
        }

        try {
            return await this.disciplinaRepository.removerDisciplina(id);
        } catch (error: any) {
            const mensagemTraduzida = this.traduzirErroRemocao(error);

            if (mensagemTraduzida) {
                const erro = new Error(mensagemTraduzida);
                (erro as any).status = 409;
                throw erro;
            }

            throw error;
        }
    }

    async alterarStatus(id: string, ativo: boolean) {
        return this.atualizarDisciplina(id, { ativo });
    }

    private comandoCompleto(data: any, exigirAcademico: boolean): DisciplinaCommand {
        const carga = this.inteiro(data.cargaHoraria, "Carga horaria total invalida", true);
        const area = this.textoOpcional(data.areaConhecimento)?.toUpperCase();
        const ementa = this.textoOpcional(data.ementa);
        const parcelasPresentes = [data.cargaHorariaTeorica, data.cargaHorariaPratica, data.cargaHorariaLaboratorio, data.cargaHorariaExtensao]
            .some((valor) => valor !== undefined && valor !== null && valor !== "");
        const deveValidar = exigirAcademico || parcelasPresentes;
        const teorica = deveValidar ? this.inteiro(data.cargaHorariaTeorica, "Carga teorica invalida") : null;
        const pratica = deveValidar ? this.inteiro(data.cargaHorariaPratica, "Carga pratica invalida") : null;
        const laboratorio = deveValidar ? this.inteiro(data.cargaHorariaLaboratorio, "Carga de laboratorio invalida") : null;
        const extensao = deveValidar ? this.inteiro(data.cargaHorariaExtensao, "Carga de extensao invalida") : null;

        if (exigirAcademico) {
            if (!area || !AREAS.has(area)) throw new Error("Area de conhecimento invalida");
            if (!ementa) throw new Error("Informe a ementa da disciplina");
        }
        if (deveValidar && teorica! + pratica! + laboratorio! + extensao! !== carga) {
            throw new Error("A soma das cargas deve ser igual a carga horaria total");
        }

        return {
            id: data.id ?? uuidv4(),
            codigo: this.textoObrigatorio(data.codigo, "Informe o codigo da disciplina").toUpperCase(),
            nome: this.textoObrigatorio(data.nome, "Informe o nome da disciplina"),
            pre_requisito: this.textoOpcional(data.preRequisito) ?? null,
            carga_horaria: carga,
            area_conhecimento: area ?? null,
            ementa: ementa ?? null,
            carga_horaria_teorica: teorica,
            carga_horaria_pratica: pratica,
            carga_horaria_laboratorio: laboratorio,
            carga_horaria_extensao: extensao,
            observacoes: this.textoOpcional(data.observacoes) ?? null,
            ativo: data.ativo ?? true,
        };
    }

    private mapearCompetencias(items: any[]): DisciplinaCompetenciaCommand[] {
        if (!Array.isArray(items)) throw new Error("Competencias invalidas");
        const ids = new Set<string>();
        return items.map((item, indice) => {
            const id = this.textoObrigatorio(item.competenciaId ?? item.competencia_id, "Competencia invalida");
            if (ids.has(id)) throw new Error("Competencia repetida na disciplina");
            ids.add(id);
            const nivel = String(item.nivelEsperado ?? item.nivel_esperado ?? "").toUpperCase() as NivelCompetencia;
            if (!NIVEIS.has(nivel)) throw new Error("Nivel esperado invalido");
            return {
                competencia_id: id,
                nivel_esperado: nivel,
                obrigatoria: item.obrigatoria ?? true,
                ordem: item.ordem === undefined ? indice : this.inteiro(item.ordem, "Ordem invalida"),
            };
        });
    }

    private async validarCompetencias(items: DisciplinaCompetenciaCommand[]) {
        if (!items.length) return;
        const existentes = await this.disciplinaRepository.buscarCompetenciasAtivas(items.map((item) => item.competencia_id));
        if (existentes.length !== items.length) throw new Error("Uma ou mais competencias nao existem ou estao inativas");
    }

    private cadastroCompleto(item: Partial<Disciplina>) {
        const parcelas = [item.carga_horaria_teorica, item.carga_horaria_pratica, item.carga_horaria_laboratorio, item.carga_horaria_extensao];
        return Boolean(item.area_conhecimento && item.ementa && parcelas.every((valor) => valor !== undefined && valor !== null) &&
            parcelas.reduce((soma, valor) => soma + Number(valor ?? 0), 0) === Number(item.carga_horaria));
    }

    private inteiro(valor: unknown, mensagem: string, positivo = false) {
        const numero = Number(valor);
        if (!Number.isInteger(numero) || (positivo ? numero <= 0 : numero < 0)) throw new Error(mensagem);
        return numero;
    }

    private textoObrigatorio(valor: unknown, mensagem: string) {
        const texto = String(valor ?? "").trim();
        if (!texto) throw new Error(mensagem);
        return texto;
    }

    private textoOpcional(valor: unknown) {
        const texto = String(valor ?? "").trim();
        return texto || undefined;
    }
}
