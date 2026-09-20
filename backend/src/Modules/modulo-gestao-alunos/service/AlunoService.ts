import bcrypt from "bcrypt";

import { db } from "../../../database/connection";
import { PessoaCommand } from "../../modulo-pessoa-usuario/models/Pessoa";
import { PessoaRepository } from "../../modulo-pessoa-usuario/repository/PessoaRepository";
import { AlunoCommand } from "../models/Aluno";
import { AlunoRepository } from "../repository/AlunoRespository";
import { validarSenha } from "../../usuario-perfil-autenticacao/services/senha-policy";
import { notificacaoService } from "../../configuracao-email/service/NotificacaoService";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AlunoService {
    alunoRepository = new AlunoRepository();
    pessoaRepository = new PessoaRepository();

    async criarAluno(data: any) {
        try {
            const aluno = await this.inserirAluno(data);
            void this.avisarInscricaoRecebida(data, aluno);
            return aluno;
        } catch (erro: any) {
            if (erro?.code === "23505" && String(erro?.constraint ?? "").includes("cpf")) {
                throw new Error("Já existe uma matrícula ativa ou pendente para este CPF.");
            }
            if (erro?.code === "23505" && String(erro?.constraint ?? "").includes("email")) {
                throw new Error("Este e-mail já está em uso por outro cadastro.");
            }
            throw erro;
        }
    }

    private async avisarInscricaoRecebida(data: any, aluno: any) {
        const email = String(data?.usuario?.email ?? "").trim().toLowerCase();
        if (!email) return;

        try {
            const curso = await db("curso").where({ id: data.curso }).first();
            await notificacaoService.notificarInscricaoRecebida({
                email,
                nome: data.pessoa.nome,
                matricula: aluno?.matricula ?? null,
                curso: curso?.nome ?? null,
            });
        } catch (erro) {
            console.error("[inscricao] falha ao enviar o e-mail de inscricao recebida:", erro);
        }
    }

    private async criarAcessoDoAluno(data: any, trx: any): Promise<string | undefined> {
        const email = String(data?.usuario?.email ?? "").trim().toLowerCase();
        const senha = data?.usuario?.senha;

        if (!email && !senha) return undefined;

        if (!FORMATO_EMAIL.test(email)) {
            throw new Error("Informe um e-mail válido para o acesso do aluno.");
        }

        validarSenha(senha);

        const emailEmUso = await trx("usuario").where({ email }).first();
        if (emailEmUso) {
            throw new Error("Este e-mail já está em uso por outro cadastro.");
        }

        const [usuario] = await trx("usuario")
            .insert({
                nome: data.pessoa.nome,
                email,
                senha: await bcrypt.hash(senha, 10),
                tipo_usuario: "aluno",
                acesso_liberado: data.liberarAcesso === true,
            })
            .returning("*");

        return usuario.id;
    }

    private async inserirAluno(data: any) {
        return await db.transaction(async (trx) => {
            
            let pessoa: PessoaCommand = {
                cpf: data.pessoa.cpf,
                nome: data.pessoa.nome,
                data_nascimento: data.pessoa.dataNascimento,
                logradouro: data.pessoa.logradouro,
                numero: data.pessoa.numero,
                bairro: data.pessoa.bairro,
                cidade_id: data.pessoa.cidadeIbge,
                estado: data.pessoa.estado,
                cep: data.pessoa.cep
            };

            const jaCadastrada = await this.pessoaRepository.buscarPessoaPorCpf(pessoa.cpf, trx);

            if (jaCadastrada) {
                const alunoExistente = await trx("aluno").where({ pessoa_id: jaCadastrada.id }).first();
                if (alunoExistente) {
                    throw new Error("Já existe uma matrícula ativa ou pendente para este CPF.");
                }

                const professorExistente = await trx("professor").where({ pessoa_id: jaCadastrada.id }).first();
                if (professorExistente) {
                    throw new Error("Este CPF já está cadastrado como professor na instituição.");
                }
            }

            const pessoaCriada = jaCadastrada
                ? (await trx("pessoa").where({ id: jaCadastrada.id }).update(pessoa).returning("*"))[0]
                : await this.pessoaRepository.criarPessoa(pessoa, trx);

            const usuarioId = data.usuarioId ?? (await this.criarAcessoDoAluno(data, trx));

            let aluno: AlunoCommand = {
                id: data.id,
                pessoa_id: pessoaCriada.id,
                usuario_id: usuarioId,
                periodo: data.periodo,
                curso_id: data.curso
            };

            return await this.alunoRepository.criarAluno(aluno, trx);
        });
    }

    async listarAlunos(filtros: any) {
        const alunos = await this.alunoRepository.listarAlunos(filtros);
        return alunos;
    }

    async buscarAlunoPorId(id: string) {
        const aluno = await this.alunoRepository.buscarAlunoPorId(id);
        return aluno;
    }

    async buscarAlunoPorMatricula(matricula: string) {
        const aluno = await this.alunoRepository.buscarAlunoPorMatricula(matricula);
        return aluno;
    }

    async atualizarAluno(matricula: string, data: any) {
        const aluno = await this.alunoRepository.buscarAlunoPorMatricula(matricula);

        if (!aluno) {
            throw new Error("Aluno não encontrado");
        }

        const email = data?.email !== undefined ? String(data.email).trim() : undefined;

        if (email && !FORMATO_EMAIL.test(email)) {
            throw new Error("Informe um e-mail válido para o aluno.");
        }

        try {
            return await this.alunoRepository.atualizarAluno(matricula, data);
        } catch (erro: any) {
            if (erro?.code === "23505" && String(erro?.constraint ?? "").includes("email")) {
                throw new Error("Este e-mail já está em uso por outro cadastro.");
            }
            if (erro?.code === "23505" && String(erro?.constraint ?? "").includes("cpf")) {
                throw new Error("Este CPF já está cadastrado para outra pessoa.");
            }

            console.error("Erro ao atualizar aluno:", erro);
            throw new Error("Não foi possível atualizar o aluno");
        }
    }

    async buscarAlunoPorCpfOuMatricula(query: string) {
        if (!query || query.trim().length < 3) {
            throw new Error("Informe ao menos 3 caracteres.");
        }
        return this.alunoRepository.buscarAlunoPorCpfOuMatricula(query.trim());
    }
}