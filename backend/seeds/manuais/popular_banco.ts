import bcrypt from "bcrypt";
import type { Knex } from "knex";

const SENHA_PADRAO = "unieduca2026";
const CIDADE_IBGE = "3169703";
const ANO = 2026;

const CURSOS = [
    {
        codigo: "ADS",
        nome: "Análise e Desenvolvimento de Sistemas",
        resumo: "Forma profissionais para projetar, desenvolver e manter sistemas, com ênfase em desenvolvimento web, banco de dados e metodologias ágeis.",
        duracao: "6 semestres",
        turno: "Noturno",
        grau: "Tecnólogo",
        destaque: true,
        disciplinas: [
            ["ADS101", "Lógica de Programação", 80, 1],
            ["ADS102", "Fundamentos de Sistemas de Informação", 60, 1],
            ["ADS103", "Matemática Discreta", 60, 1],
            ["ADS104", "Arquitetura de Computadores", 60, 1],
            ["ADS105", "Comunicação e Expressão", 40, 1],
            ["ADS201", "Programação Orientada a Objetos", 80, 2],
            ["ADS202", "Banco de Dados I", 80, 2],
            ["ADS203", "Estrutura de Dados", 80, 2],
            ["ADS204", "Engenharia de Software", 60, 2],
            ["ADS301", "Desenvolvimento Web", 80, 3],
            ["ADS302", "Banco de Dados II", 60, 3],
            ["ADS303", "Redes de Computadores", 60, 3],
            ["ADS304", "Análise e Projeto de Sistemas", 80, 3],
            ["ADS401", "Desenvolvimento Mobile", 80, 4],
            ["ADS402", "Qualidade e Teste de Software", 60, 4],
            ["ADS403", "Segurança da Informação", 60, 4],
        ],
    },
    {
        codigo: "ADM",
        nome: "Administração",
        resumo: "Prepara gestores para atuar em planejamento, finanças, pessoas e operações, com visão estratégica e foco em resultados.",
        duracao: "8 semestres",
        turno: "Noturno",
        grau: "Bacharelado",
        destaque: true,
        disciplinas: [
            ["ADM101", "Teoria Geral da Administração", 80, 1],
            ["ADM102", "Matemática Aplicada", 60, 1],
            ["ADM103", "Introdução à Economia", 60, 1],
            ["ADM104", "Comunicação Empresarial", 40, 1],
            ["ADM105", "Sociologia das Organizações", 40, 1],
            ["ADM201", "Contabilidade Geral", 80, 2],
            ["ADM202", "Comportamento Organizacional", 60, 2],
            ["ADM203", "Estatística Aplicada", 60, 2],
            ["ADM204", "Direito Empresarial", 60, 2],
            ["ADM301", "Gestão de Pessoas", 80, 3],
            ["ADM302", "Marketing", 60, 3],
            ["ADM303", "Administração Financeira", 80, 3],
            ["ADM304", "Gestão da Produção", 60, 3],
            ["ADM401", "Planejamento Estratégico", 80, 4],
            ["ADM402", "Logística e Cadeia de Suprimentos", 60, 4],
            ["ADM403", "Empreendedorismo", 60, 4],
        ],
    },
    {
        codigo: "CCO",
        nome: "Ciências Contábeis",
        resumo: "Habilita o profissional para escrituração, auditoria, perícia e planejamento tributário, atendendo empresas de todos os portes.",
        duracao: "8 semestres",
        turno: "Noturno",
        grau: "Bacharelado",
        destaque: false,
        disciplinas: [
            ["CCO101", "Contabilidade Introdutória", 80, 1],
            ["CCO102", "Matemática Financeira", 60, 1],
            ["CCO103", "Instituições de Direito", 60, 1],
            ["CCO104", "Métodos Quantitativos", 60, 1],
            ["CCO105", "Teoria da Contabilidade", 40, 1],
            ["CCO201", "Contabilidade Intermediária", 80, 2],
            ["CCO202", "Direito Tributário", 60, 2],
            ["CCO203", "Análise de Custos", 80, 2],
            ["CCO204", "Estatística", 60, 2],
            ["CCO301", "Contabilidade de Custos", 80, 3],
            ["CCO302", "Contabilidade Tributária", 80, 3],
            ["CCO303", "Auditoria Contábil", 60, 3],
            ["CCO304", "Análise das Demonstrações Contábeis", 60, 3],
            ["CCO401", "Perícia Contábil", 60, 4],
            ["CCO402", "Controladoria", 80, 4],
            ["CCO403", "Contabilidade Pública", 60, 4],
        ],
    },
];

const PROFESSORES = [
    ["Helena Martins Prado", "70100000001", "ADS"],
    ["Rafael Nogueira Dias", "70100000002", "ADS"],
    ["Camila Freitas Lopes", "70100000003", "ADS"],
    ["Eduardo Bastos Ferreira", "70100000004", "ADM"],
    ["Patrícia Alves Moreira", "70100000005", "ADM"],
    ["Marcelo Tavares Ramos", "70100000006", "ADM"],
    ["Juliana Campos Siqueira", "70100000007", "CCO"],
    ["Fernando Aguiar Pinto", "70100000008", "CCO"],
    ["Renata Duarte Cardoso", "70100000009", "CCO"],
];

const NOMES = [
    "Ana Beatriz Ramos", "Bruno Carvalho Lima", "Carla Menezes Duarte", "Diego Almeida Rocha",
    "Eduarda Pires Nunes", "Felipe Moraes Antunes", "Gabriela Teixeira Souza", "Henrique Barros Melo",
    "Isabela Fonseca Reis", "João Pedro Vasconcelos", "Karina Lopes Batista", "Lucas Ferreira Pontes",
    "Mariana Azevedo Braga", "Nicolas Correia Viana", "Olívia Santana Freire", "Pedro Henrique Caldas",
    "Queila Monteiro Assis", "Rafael Guimarães Pinto", "Sofia Bernardes Cunha", "Thiago Pacheco Leal",
    "Ursula Nogueira Prado", "Vinícius Andrade Sales", "Wesley Moreira Tavares", "Yasmin Cordeiro Paiva",
    "Zeca Ribeiro Fontes", "Amanda Queiroz Dias", "Bernardo Siqueira Lopes", "Cecília Andrade Rocha",
    "Daniel Moura Bastos", "Elisa Camargo Neves", "Fábio Rezende Amorim", "Giovana Peixoto Faria",
    "Hugo Sampaio Vieira", "Iara Bittencourt Lima", "Jonas Medeiros Farias", "Lívia Marques Toledo",
];

const NOTICIAS = [
    {
        titulo: "Inscrições abertas para o processo seletivo 2026",
        slug: "inscricoes-abertas-processo-seletivo-2026",
        categoria: "vestibular",
        resumo: "Use a sua nota do ENEM e garanta a vaga. A inscrição é online, gratuita e sem prova.",
        conteudo:
            "As inscrições para o processo seletivo 2026 da UniEduca estão abertas.\n\n" +
            "O ingresso é feito exclusivamente pela nota do ENEM, sem prova própria e sem taxa de inscrição. " +
            "Todo o processo acontece pelo site: o candidato preenche o formulário, envia os documentos digitalizados " +
            "e acompanha a validação feita pela secretaria.\n\n" +
            "Assim que a documentação é aprovada, a matrícula é gerada e o acesso ao portal do aluno é liberado por e-mail.",
        destaque: true,
    },
    {
        titulo: "Semana acadêmica reúne palestras e oficinas",
        slug: "semana-academica-palestras-oficinas",
        categoria: "eventos",
        resumo: "Três dias de programação com profissionais do mercado, oficinas práticas e rodas de conversa.",
        conteudo:
            "A semana acadêmica da UniEduca chega com programação aberta a alunos de todos os cursos.\n\n" +
            "São três dias de palestras com profissionais atuantes no mercado, oficinas práticas nos laboratórios " +
            "e rodas de conversa sobre carreira.\n\n" +
            "A participação conta como horas complementares. As inscrições são feitas pelo portal do aluno.",
        destaque: false,
    },
    {
        titulo: "Portal do aluno passa a reunir notas, frequência e documentos",
        slug: "portal-do-aluno-notas-frequencia-documentos",
        categoria: "institucional",
        resumo: "Tudo o que o aluno precisa acompanhar agora fica em um lugar só, com acesso pelo celular.",
        conteudo:
            "O portal do aluno da UniEduca passou por uma atualização e agora concentra notas, frequência, " +
            "documentos da matrícula e o histórico acadêmico em uma única tela.\n\n" +
            "O acesso funciona no computador e no celular, com o mesmo e-mail e senha cadastrados na inscrição.",
        destaque: false,
    },
    {
        titulo: "Calendário acadêmico do primeiro semestre é divulgado",
        slug: "calendario-academico-primeiro-semestre",
        categoria: "academico",
        resumo: "Confira as datas de início das aulas, provas e lançamento de notas.",
        conteudo:
            "A secretaria acadêmica divulgou o calendário do primeiro semestre letivo.\n\n" +
            "O documento traz as datas de início e término das aulas, período de provas, prazo para lançamento de notas " +
            "e os feriados do semestre.\n\n" +
            "O calendário também fica disponível no portal do aluno.",
        destaque: false,
    },
];

const ALBUNS = [
    { titulo: "Aula inaugural 2026", slug: "aula-inaugural-2026", descricao: "Recepção dos calouros e apresentação dos coordenadores de curso." },
    { titulo: "Laboratórios de informática", slug: "laboratorios-de-informatica", descricao: "Estrutura usada nas aulas práticas dos cursos de tecnologia." },
    { titulo: "Formatura 2025", slug: "formatura-2025", descricao: "Colação de grau das turmas concluintes de 2025." },
];

function cpfDe(indice: number): string {
    return String(80000000000 + indice);
}

function emailDe(nome: string, indice: number): string {
    const base = nome
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .split(" ")
        .slice(0, 2)
        .join(".");

    return `${base}${indice}@aluno.unieduca.net.br`;
}

export async function seed(db: Knex): Promise<void> {
    const piv = (tabela: string) => db(`piv.${tabela}`);
    const senha = await bcrypt.hash(SENHA_PADRAO, 10);

    const cidade = await piv("cidade").where({ ibge: CIDADE_IBGE }).first();
    if (!cidade) {
        throw new Error(`Cidade ${CIDADE_IBGE} não encontrada. Rode o seed de cidades antes deste.`);
    }

    // ---------- limpeza do que este seed cria ----------
    await piv("matricula_turma_disciplina").delete();
    await piv("matricula").delete();
    await piv("documento").delete();
    await piv("turma_disciplina").delete();
    await piv("turma").delete();
    await piv("aluno").delete();
    await piv("professor").delete();
    await piv("curso_disciplina").delete();
    await piv("site_curso").delete();
    await piv("curso").delete();
    await piv("disciplinas").delete();
    await piv("departamento").delete();
    await piv("faculdade").delete();
    await piv("periodo_letivo").delete();
    await piv("site_foto").delete();
    await piv("site_album").delete();
    await piv("site_noticia").delete();
    await piv("usuario").whereIn("tipo_usuario", ["aluno", "professor"]).delete();
    await piv("pessoa").delete();

    // ---------- usuarios administrativos ----------
    await piv("usuario")
        .insert([
            { nome: "Suporte UniEduca", email: "suporte@unieduca.com.br", senha, tipo_usuario: "administrador", acesso_liberado: true },
            { nome: "Secretaria Acadêmica", email: "secretaria@unieduca.com.br", senha, tipo_usuario: "secretaria", acesso_liberado: true },
        ])
        .onConflict("email")
        .merge(["nome", "senha", "tipo_usuario", "acesso_liberado"]);

    // ---------- faculdade e departamento ----------
    const [faculdade] = await piv("faculdade")
        .insert({
            nome: "UniEduca",
            cidade_id: CIDADE_IBGE,
            logradouro: "Avenida Central",
            numero: "1200",
            bairro: "Centro",
            cep: "36500000",
        })
        .returning("*");

    const [departamento] = await piv("departamento")
        .insert({ codigo: "DEP-GERAL", nome: "Departamento Acadêmico", faculdade_id: faculdade.id })
        .returning("*");

    // ---------- periodo letivo ----------
    const [periodo] = await piv("periodo_letivo")
        .insert({
            codigo: `${ANO}.1`,
            ano: ANO,
            semestre: 1,
            data_inicio: `${ANO}-02-02`,
            data_fim: `${ANO}-06-30`,
            ativo: true,
            status: "em_andamento",
        })
        .returning("*");

    // ---------- cursos, disciplinas e matriz ----------
    const cursosCriados: Record<string, any> = {};
    const matrizPorCurso: Record<string, any[]> = {};

    for (const [indice, curso] of CURSOS.entries()) {
        const [registro] = await piv("curso")
            .insert({ codigo: curso.codigo, nome: curso.nome, departamento_id: departamento.id })
            .returning("*");

        cursosCriados[curso.codigo] = registro;

        const disciplinas = await piv("disciplinas")
            .insert(
                curso.disciplinas.map(([codigo, nome, carga]) => ({
                    codigo,
                    nome,
                    carga_horaria: carga,
                    ativo: true,
                })),
            )
            .returning("*");

        const matriz = await piv("curso_disciplina")
            .insert(
                disciplinas.map((disciplina: any, i: number) => ({
                    curso_id: registro.id,
                    disciplina_id: disciplina.id,
                    periodo_ideal: curso.disciplinas[i][3],
                    obrigatoria: true,
                    carga_horaria: curso.disciplinas[i][2],
                    ativo: true,
                })),
            )
            .returning("*");

        matrizPorCurso[curso.codigo] = matriz;

        await piv("site_curso").insert({
            curso_id: registro.id,
            resumo: curso.resumo,
            duracao: curso.duracao,
            turno: curso.turno,
            grau: curso.grau,
            destaque: curso.destaque,
            inscricoes_abertas: true,
            ativo: true,
            ordem: indice + 1,
        });
    }

    // ---------- professores ----------
    const professoresPorCurso: Record<string, any[]> = { ADS: [], ADM: [], CCO: [] };

    for (const [indice, [nome, cpf, cursoCodigo]] of PROFESSORES.entries()) {
        const [usuario] = await piv("usuario")
            .insert({
                nome,
                email: `professor${indice + 1}@unieduca.net.br`,
                senha,
                tipo_usuario: "professor",
                acesso_liberado: true,
            })
            .returning("*");

        const [pessoa] = await piv("pessoa")
            .insert({
                nome,
                cpf,
                data_nascimento: "1985-03-15",
                logradouro: "Rua dos Professores",
                numero: String(100 + indice),
                bairro: "Centro",
                cidade_id: CIDADE_IBGE,
                estado: "MG",
                cep: "36500000",
            })
            .returning("*");

        const [professor] = await piv("professor")
            .insert({
                usuario_id: usuario.id,
                pessoa_id: pessoa.id,
                curso_id: cursosCriados[cursoCodigo].id,
                faculdade_id: faculdade.id,
                ativo: true,
            })
            .returning("*");

        professoresPorCurso[cursoCodigo].push(professor);
    }

    // ---------- turmas e disciplinas ofertadas ----------
    const turmasPorCurso: Record<string, any[]> = { ADS: [], ADM: [], CCO: [] };

    for (const curso of CURSOS) {
        const registro = cursosCriados[curso.codigo];
        const professores = professoresPorCurso[curso.codigo];

        for (const periodoCurricular of [1, 2, 3]) {
            const [turma] = await piv("turma")
                .insert({
                    periodo_letivo_id: periodo.id,
                    curso_id: registro.id,
                    periodo_curricular: periodoCurricular,
                    descricao: `${curso.nome} — ${periodoCurricular}º período`,
                    sigla: `${curso.codigo}${periodoCurricular}A`,
                    capacidade_alunos: 40,
                    turno: "Noturno",
                    status: "ativa",
                })
                .returning("*");

            turmasPorCurso[curso.codigo].push(turma);

            const doPeriodo = matrizPorCurso[curso.codigo].filter((m: any) => m.periodo_ideal === periodoCurricular);

            if (doPeriodo.length > 0) {
                await piv("turma_disciplina").insert(
                    doPeriodo.map((matriz: any, i: number) => ({
                        turma_id: turma.id,
                        curso_disciplina_id: matriz.id,
                        professor_id: professores[i % professores.length].id,
                        status: "ativa",
                    })),
                );
            }
        }
    }

    // ---------- alunos, matriculas e vinculos ----------
    const codigos = CURSOS.map((c) => c.codigo);
    let matriculaAtual = 0;

    for (const [indice, nome] of NOMES.entries()) {
        const cursoCodigo = codigos[indice % codigos.length];
        const curso = cursosCriados[cursoCodigo];
        const turma = turmasPorCurso[cursoCodigo][indice % 3];
        const periodoCurricular = turma.periodo_curricular;

        // Os tres ultimos ficam como inscricao pendente, para demonstrar a validacao de documentos.
        const pendente = indice >= NOMES.length - 3;
        matriculaAtual += 1;

        const [usuario] = await piv("usuario")
            .insert({
                nome,
                email: emailDe(nome, indice + 1),
                senha,
                tipo_usuario: "aluno",
                acesso_liberado: !pendente,
            })
            .returning("*");

        const [pessoa] = await piv("pessoa")
            .insert({
                nome,
                cpf: cpfDe(indice + 1),
                data_nascimento: `${2000 + (indice % 8)}-0${(indice % 9) + 1}-1${indice % 9}`,
                logradouro: "Rua das Acácias",
                numero: String(10 + indice),
                bairro: "Centro",
                cidade_id: CIDADE_IBGE,
                estado: "MG",
                cep: "36500000",
            })
            .returning("*");

        const [aluno] = await piv("aluno")
            .insert({
                matricula: matriculaAtual,
                usuario_id: usuario.id,
                pessoa_id: pessoa.id,
                curso_id: curso.id,
                periodo: String(periodoCurricular),
            })
            .returning("*");

        const tiposDocumento = ["RG", "HISTORICO", "COMPROVANTE_RESIDENCIA", "NOTAS_ENEM", "COMPROVANTE_INSCRICAO_ENEM"];

        await piv("documento").insert(
            tiposDocumento.map((tipo) => ({
                aluno_id: aluno.id,
                tipo_documento: tipo,
                nome_arquivo: `${tipo.toLowerCase()}.pdf`,
                caminho_arquivo: `uploads/demo/${tipo.toLowerCase()}.pdf`,
                status: pendente ? "PENDENTE" : "APROVADO",
            })),
        );

        if (pendente) continue;

        const [matricula] = await piv("matricula")
            .insert({
                aluno_id: aluno.id,
                curso_id: curso.id,
                turma_id: turma.id,
                status: "ativa",
                data_matricula: `${ANO}-02-05`,
            })
            .returning("*");

        const ofertadas = await piv("turma_disciplina").where({ turma_id: turma.id });

        if (ofertadas.length > 0) {
            await piv("matricula_turma_disciplina").insert(
                ofertadas.map((oferta: any) => ({
                    matricula_id: matricula.id,
                    turma_disciplina_id: oferta.id,
                })),
            );
        }
    }

    await db.raw(`SELECT setval('piv.aluno_matricula_seq', ?, true)`, [matriculaAtual]);

    // ---------- conteudo do site ----------
    const categorias = await piv("site_categoria").select("id", "slug");
    const idDaCategoria = (slug: string) => categorias.find((c: any) => c.slug === slug)?.id ?? null;

    await piv("site_noticia").insert(
        NOTICIAS.map((noticia, i) => ({
            titulo: noticia.titulo,
            slug: noticia.slug,
            imagem: "",
            resumo: noticia.resumo,
            conteudo: noticia.conteudo,
            categoria_id: idDaCategoria(noticia.categoria),
            autor: "Secretaria Acadêmica",
            publicado_em: `${ANO}-0${(i % 9) + 1}-1${i % 9}`,
            destaque: noticia.destaque,
            status: "publicado",
        })),
    );

    await piv("site_album").insert(
        ALBUNS.map((album, i) => ({
            titulo: album.titulo,
            slug: album.slug,
            descricao: album.descricao,
            capa: "",
            data: `${ANO}-0${i + 2}-15`,
            status: "publicado",
            ordem: i + 1,
        })),
    );

    const ativos = NOMES.length - 3;
    console.log(
        `Demo populada: 3 cursos, ${CURSOS.reduce((t, c) => t + c.disciplinas.length, 0)} disciplinas, ` +
            `9 turmas, ${PROFESSORES.length} professores, ${NOMES.length} alunos ` +
            `(${ativos} matriculados, 3 aguardando validação de documentos). ` +
            `Senha de todos: ${SENHA_PADRAO}`,
    );
}
