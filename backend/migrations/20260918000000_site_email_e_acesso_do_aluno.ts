import type { Knex } from "knex";

const SCHEMA = "piv";

const DISPARADORES = [
    {
        chave: "inscricao_recebida",
        nome: "Inscrição recebida",
        descricao: "Enviado ao candidato assim que a inscrição é concluída na tela pública.",
        ativo: true,
        remetente_nome: "UniEduca",
        remetente_email: "naoresponda@unieduca.net.br",
        assunto: "Recebemos a sua inscrição — UniEduca",
        titulo: "Inscrição recebida com sucesso",
        mensagem:
            "Sua inscrição foi registrada e já está em análise pela secretaria. " +
            "Aguarde a validação dos documentos enviados: assim que a conferência for concluída, " +
            "você receberá um novo e-mail com o resultado.",
    },
    {
        chave: "documentacao_aprovada",
        nome: "Documentação aprovada",
        descricao: "Enviado ao aluno quando todos os documentos da inscrição são aprovados.",
        ativo: true,
        remetente_nome: "UniEduca",
        remetente_email: "contato@unieduca.net.br",
        assunto: "Bem-vindo(a) à UniEduca — documentação aprovada",
        titulo: "Documentação aprovada. Boas-vindas!",
        mensagem:
            "Confirmamos a aprovação de toda a sua documentação. " +
            "Seu cadastro de aluno já está ativo e você pode acessar o portal com o e-mail e a senha " +
            "informados na inscrição.",
    },
    {
        chave: "documentacao_reprovada",
        nome: "Documentação reprovada",
        descricao: "Enviado ao candidato quando algum documento da inscrição é recusado, com o link para reenviar.",
        ativo: true,
        remetente_nome: "UniEduca",
        remetente_email: "contato@unieduca.net.br",
        assunto: "Documentos pendentes na sua inscrição — UniEduca",
        titulo: "Precisamos que você reenvie alguns documentos",
        mensagem:
            "Conferimos a sua documentação e alguns arquivos não foram aceitos. " +
            "Use o botão abaixo para enviar novamente apenas os documentos recusados. " +
            "Assim que recebermos, a secretaria faz uma nova conferência.",
    },
    {
        chave: "recuperacao_senha",
        nome: "Recuperação de senha",
        descricao: "Enviado quando alguém solicita a redefinição da própria senha.",
        ativo: true,
        remetente_nome: "UniEduca",
        remetente_email: "suporte@unieduca.net.br",
        assunto: "Redefinição de senha — UniEduca",
        titulo: "Redefinição de senha",
        mensagem:
            "Recebemos um pedido para redefinir a sua senha. " +
            "Use o botão abaixo para criar uma nova. Se não foi você, ignore este e-mail.",
    },
];

const REMETENTES = [
    { email: "naoresponda@unieduca.net.br", nome: "UniEduca" },
    { email: "contato@unieduca.net.br", nome: "UniEduca" },
    { email: "comunicacao@unieduca.net.br", nome: "UniEduca" },
    { email: "suporte@unieduca.net.br", nome: "Suporte UniEduca" },
];

const CONFIGURACOES = [
    { chave: "site_nome", valor: "UniEduca", grupo: "identidade" },
    { chave: "site_descricao", valor: "Graduação presencial com ingresso pela nota do ENEM.", grupo: "identidade" },
    { chave: "site_logo", valor: "", grupo: "identidade" },
    { chave: "site_favicon", valor: "/assets/favIcon.svg", grupo: "identidade" },
    { chave: "cor_primaria", valor: "#05b5e6", grupo: "identidade" },
    { chave: "cor_institucional", valor: "#0a3d52", grupo: "identidade" },
    { chave: "contato_telefone", valor: "(32) 3000-0000", grupo: "contato" },
    { chave: "contato_whatsapp", valor: "", grupo: "contato" },
    { chave: "contato_email", valor: "contato@unieduca.net.br", grupo: "contato" },
    { chave: "contato_endereco", valor: "Ubá — Minas Gerais", grupo: "contato" },
    { chave: "contato_horario", valor: "Segunda a sexta, das 8h às 21h", grupo: "contato" },
    { chave: "rede_instagram", valor: "", grupo: "redes" },
    { chave: "rede_facebook", valor: "", grupo: "redes" },
    { chave: "rede_youtube", valor: "", grupo: "redes" },
    {
        chave: "rodape_texto",
        valor: "Instituição de ensino superior com graduação presencial e ingresso simplificado pela nota do ENEM.",
        grupo: "rodape",
    },
    { chave: "rodape_copyright", valor: "UniEduca. Todos os direitos reservados.", grupo: "rodape" },
    { chave: "url_inscricao", valor: "/inscricao", grupo: "inscricao" },
];

const MENU = [
    { rotulo: "Início", url: "/", ordem: 1, ativo: true, externo: false },
    { rotulo: "Sobre", url: "/sobre", ordem: 2, ativo: true, externo: false },
    { rotulo: "Cursos", url: "/cursos", ordem: 3, ativo: true, externo: false },
    { rotulo: "Notícias", url: "/noticias", ordem: 4, ativo: true, externo: false },
    { rotulo: "Galeria", url: "/galeria", ordem: 5, ativo: true, externo: false },
    { rotulo: "Contato", url: "/contato", ordem: 6, ativo: true, externo: false },
];

const CATEGORIAS = [
    { nome: "Vestibular", slug: "vestibular", ordem: 1 },
    { nome: "Eventos", slug: "eventos", ordem: 2 },
    { nome: "Institucional", slug: "institucional", ordem: 3 },
    { nome: "Acadêmico", slug: "academico", ordem: 4 },
];

const BANNERS = [
    {
        titulo: "Faça sua matrícula UniEduca",
        subtitulo: "Inscrições abertas. Use a nota do ENEM e garanta a sua vaga.",
        imagem: "/img/banner1.jpg",
        ordem: 1,
    },
    {
        titulo: "Matricule-se na UniEduca",
        subtitulo: "Seu futuro começa com uma boa escolha.",
        imagem: "/img/banner2.jpg",
        ordem: 2,
    },
    {
        titulo: "Seu futuro começa na UniEduca",
        subtitulo: "Mais que um curso, uma comunidade que acredita em você.",
        imagem: "/img/banner3.jpg",
        ordem: 3,
    },
];

export async function up(db: Knex): Promise<void> {
    const tem = (tabela: string) => db.schema.withSchema(SCHEMA).hasTable(tabela);

    if (!(await tem("configuracao_email"))) {
        await db.schema.withSchema(SCHEMA).createTable("configuracao_email", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.string("chave", 60).notNullable().unique();
            t.string("nome", 120).notNullable();
            t.string("descricao", 255).notNullable();
            t.boolean("ativo").notNullable().defaultTo(true);
            t.string("remetente_nome", 120).notNullable();
            t.string("remetente_email", 160).notNullable();
            t.string("assunto", 200).notNullable();
            t.string("titulo", 200).notNullable();
            t.text("mensagem").notNullable();
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        });
    }

    await db(`${SCHEMA}.configuracao_email`).insert(DISPARADORES).onConflict("chave").ignore();

    if (!(await tem("configuracao_smtp"))) {
        await db.schema.withSchema(SCHEMA).createTable("configuracao_smtp", (t) => {
            t.integer("id").primary().defaultTo(1);
            t.string("host", 200).notNullable().defaultTo("");
            t.integer("porta").notNullable().defaultTo(465);
            t.boolean("seguro").notNullable().defaultTo(true);
            t.string("usuario", 200).notNullable().defaultTo("");
            t.text("senha_cifrada").notNullable().defaultTo("");
            t.string("remetente_nome", 140).notNullable().defaultTo("UniEduca");
            t.string("remetente_email", 200).notNullable().defaultTo("");
            t.boolean("ativo").notNullable().defaultTo(false);
            t.timestamp("testado_em", { useTz: true }).nullable();
            t.string("resultado_teste", 400).notNullable().defaultTo("");
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.check("id = 1");
        });

        await db(`${SCHEMA}.configuracao_smtp`).insert({
            id: 1,
            host: process.env.SMTP_HOST ?? "email-ssl.com.br",
            porta: Number(process.env.SMTP_PORT ?? 465),
            seguro: (process.env.SMTP_SECURE ?? "true") === "true",
            usuario: process.env.SMTP_USER ?? "",
            remetente_nome: process.env.SMTP_FROM_NAME ?? "UniEduca",
            remetente_email: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? "",
            ativo: false,
        });
    }

    if (!(await tem("email_remetente"))) {
        await db.schema.withSchema(SCHEMA).createTable("email_remetente", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.string("email", 200).notNullable().unique();
            t.string("nome", 140).notNullable().defaultTo("UniEduca");
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        });
    }

    await db(`${SCHEMA}.email_remetente`).insert(REMETENTES).onConflict("email").ignore();

    if (!(await tem("site_banner"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_banner", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.string("titulo", 180).notNullable();
            t.string("subtitulo", 300).notNullable().defaultTo("");
            t.string("imagem_desktop", 400).notNullable().defaultTo("");
            t.string("imagem_mobile", 400).notNullable().defaultTo("");
            t.string("texto_botao", 80).notNullable().defaultTo("Saiba mais");
            t.string("url_botao", 400).notNullable().defaultTo("/inscricao");
            t.boolean("nova_aba").notNullable().defaultTo(false);
            t.boolean("destaque").notNullable().defaultTo(false);
            t.boolean("ativo").notNullable().defaultTo(true);
            t.integer("ordem").notNullable().defaultTo(0);
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        });
    }

    if (!(await tem("site_categoria"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_categoria", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.string("nome", 120).notNullable();
            t.string("slug", 140).notNullable().unique();
            t.integer("ordem").notNullable().defaultTo(0);
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        });
    }

    if (!(await tem("site_noticia"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_noticia", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.string("titulo", 200).notNullable();
            t.string("slug", 220).notNullable().unique();
            t.string("imagem", 400).notNullable().defaultTo("");
            t.string("resumo", 400).notNullable().defaultTo("");
            t.text("conteudo").notNullable().defaultTo("");
            t.uuid("categoria_id").nullable().references("id").inTable(`${SCHEMA}.site_categoria`).onDelete("SET NULL");
            t.string("autor", 140).notNullable().defaultTo("");
            t.date("publicado_em").nullable();
            t.boolean("destaque").notNullable().defaultTo(false);
            t.string("status", 20).notNullable().defaultTo("rascunho");
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.index(["status", "publicado_em"]);
        });
    }

    if (!(await tem("site_album"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_album", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.string("titulo", 200).notNullable();
            t.string("slug", 220).notNullable().unique();
            t.string("descricao", 500).notNullable().defaultTo("");
            t.string("capa", 400).notNullable().defaultTo("");
            t.date("data").nullable();
            t.string("status", 20).notNullable().defaultTo("rascunho");
            t.integer("ordem").notNullable().defaultTo(0);
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        });
    }

    if (!(await tem("site_foto"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_foto", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.uuid("album_id").notNullable().references("id").inTable(`${SCHEMA}.site_album`).onDelete("CASCADE");
            t.string("arquivo", 400).notNullable();
            t.string("titulo", 200).notNullable().defaultTo("");
            t.string("descricao", 500).notNullable().defaultTo("");
            t.integer("ordem").notNullable().defaultTo(0);
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.index(["album_id", "ordem"]);
        });
    }

    if (!(await tem("site_configuracao"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_configuracao", (t) => {
            t.string("chave", 80).primary();
            t.text("valor").notNullable().defaultTo("");
            t.string("grupo", 40).notNullable().defaultTo("geral");
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        });
    }

    if (!(await tem("site_menu_item"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_menu_item", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.string("rotulo", 120).notNullable();
            t.string("url", 400).notNullable();
            t.integer("ordem").notNullable().defaultTo(0);
            t.boolean("ativo").notNullable().defaultTo(true);
            t.boolean("externo").notNullable().defaultTo(false);
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
        });
    }

    if (!(await tem("site_curso"))) {
        await db.schema.withSchema(SCHEMA).createTable("site_curso", (t) => {
            t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
            t.uuid("curso_id").notNullable().unique().references("id").inTable(`${SCHEMA}.curso`).onDelete("CASCADE");
            t.string("resumo", 500).notNullable().defaultTo("");
            t.string("duracao", 60).notNullable().defaultTo("");
            t.string("turno", 60).notNullable().defaultTo("");
            t.string("grau", 60).notNullable().defaultTo("Bacharelado");
            t.string("imagem", 400).notNullable().defaultTo("");
            t.boolean("inscricoes_abertas").notNullable().defaultTo(true);
            t.boolean("destaque").notNullable().defaultTo(false);
            t.boolean("ativo").notNullable().defaultTo(true);
            t.integer("ordem").notNullable().defaultTo(0);
            t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
            t.index(["ativo", "ordem"]);
        });
    }

    await db(`${SCHEMA}.site_configuracao`).insert(CONFIGURACOES).onConflict("chave").ignore();
    await db(`${SCHEMA}.site_categoria`).insert(CATEGORIAS).onConflict("slug").ignore();

    if (Number((await db(`${SCHEMA}.site_menu_item`).count("id as total").first())?.total ?? 0) === 0) {
        await db(`${SCHEMA}.site_menu_item`).insert(MENU);
    }

    for (const banner of BANNERS) {
        const existente = await db(`${SCHEMA}.site_banner`).where({ imagem_desktop: banner.imagem }).first();

        const dados = {
            titulo: banner.titulo,
            subtitulo: banner.subtitulo,
            imagem_desktop: banner.imagem,
            imagem_mobile: banner.imagem,
            texto_botao: "FAÇA SUA INSCRIÇÃO",
            url_botao: "/inscricao",
            destaque: banner.ordem === 1,
            ativo: true,
            ordem: banner.ordem,
            updated_at: db.fn.now(),
        };

        if (existente) await db(`${SCHEMA}.site_banner`).where({ id: existente.id }).update(dados);
        else await db(`${SCHEMA}.site_banner`).insert(dados);
    }

    const cursos = await db(`${SCHEMA}.curso`).select("id").orderBy("nome");

    if (cursos.length > 0) {
        await db(`${SCHEMA}.site_curso`)
            .insert(
                cursos.map((curso: { id: string }, indice: number) => ({
                    curso_id: curso.id,
                    ordem: indice + 1,
                    ativo: true,
                    inscricoes_abertas: true,
                })),
            )
            .onConflict("curso_id")
            .ignore();
    }

    if (!(await db.schema.withSchema(SCHEMA).hasColumn("usuario", "acesso_liberado"))) {
        await db.schema.withSchema(SCHEMA).alterTable("usuario", (t) => {
            t.boolean("acesso_liberado").notNullable().defaultTo(true);
        });

        await db(`${SCHEMA}.usuario as u`)
            .update({ acesso_liberado: false })
            .where("u.tipo_usuario", "aluno")
            .whereExists(function () {
                this.select(db.raw("1"))
                    .from(`${SCHEMA}.aluno as a`)
                    .join(`${SCHEMA}.matricula as m`, "m.aluno_id", "a.id")
                    .whereRaw("a.usuario_id = u.id")
                    .where("m.status", "pendente");
            })
            .whereNotExists(function () {
                this.select(db.raw("1"))
                    .from(`${SCHEMA}.aluno as a2`)
                    .join(`${SCHEMA}.matricula as m2`, "m2.aluno_id", "a2.id")
                    .whereRaw("a2.usuario_id = u.id")
                    .whereNot("m2.status", "pendente");
            });
    }
}

export async function down(db: Knex): Promise<void> {
    if (await db.schema.withSchema(SCHEMA).hasColumn("usuario", "acesso_liberado")) {
        await db.schema.withSchema(SCHEMA).alterTable("usuario", (t) => {
            t.dropColumn("acesso_liberado");
        });
    }

    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_curso");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_foto");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_album");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_noticia");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_categoria");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_menu_item");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_configuracao");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("site_banner");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("email_remetente");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("configuracao_smtp");
    await db.schema.withSchema(SCHEMA).dropTableIfExists("configuracao_email");
}
