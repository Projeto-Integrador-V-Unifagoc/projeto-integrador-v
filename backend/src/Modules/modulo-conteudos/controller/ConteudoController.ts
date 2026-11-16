import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { ConteudoError, erroConteudo } from "../errors/ConteudoError";
import { ConteudoAuthContext } from "../gateways/ConteudoAuthContext";
import { ConteudoRepository } from "../repository/ConteudoRepository";
import { ConteudoService } from "../service/ConteudoService";
import { descartarArquivo } from "../../modulo-documentos/service/ValidacaoArquivo";
import { caminhoCompleto, nomeEmDisco } from "../service/pastaUploads";

export class ConteudoController {
  constructor(
    private repository = new ConteudoRepository(),
    private service = new ConteudoService(repository),
    private auth = new ConteudoAuthContext(repository),
  ) {}

  private erro(res: Response, error: unknown) {
    if (error instanceof ConteudoError) {
      return res.status(error.status).json({ codigo: error.codigo, mensagem: error.message, detalhes: error.detalhes });
    }
    console.error("Erro no módulo de conteúdos", error);
    return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem: "Erro interno do servidor." });
  }

  // Resolve o contexto do usuário e executa a ação, tratando os erros do módulo.
  // O aluno só passa nas rotas de leitura marcadas com `permitirAluno`.
  private executar(
    acao: (req: Request, ctx: Awaited<ReturnType<ConteudoAuthContext["obterContexto"]>>) => Promise<unknown>,
    status = 200,
    permitirAluno = false,
  ) {
    return async (req: Request, res: Response) => {
      try {
        const ctx = await this.auth.obterContexto(req);
        if (ctx.perfil === "aluno" && !permitirAluno) throw erroConteudo.proibido("O cadastro de conteúdos é restrito a professores e à secretaria.");
        const resultado = await acao(req, ctx);
        if (status === 204) return res.status(204).send();
        return res.status(status).json(resultado);
      } catch (e) {
        return this.erro(res, e);
      }
    };
  }

  listarCursos = this.executar((_req, ctx) => this.service.listarCursos(ctx));
  listarDisciplinas = this.executar((req, ctx) => this.service.listarDisciplinas(ctx, String(req.params.cursoId)));
  detalhar = this.executar((req, ctx) => this.service.detalhar(ctx, String(req.params.id)));
  transferirResponsavel = this.executar((req, ctx) =>
    this.service.transferirResponsavel(ctx, String(req.params.id), req.body?.professorId),
  );
  reordenar = this.executar((req, ctx) => this.service.reordenar(ctx, String(req.params.id), req.body));

  criarTopico = this.executar((req, ctx) => this.service.criarTopico(ctx, String(req.params.id), req.body), 201);
  atualizarTopico = this.executar((req, ctx) => this.service.atualizarTopico(ctx, String(req.params.id), req.body));
  publicarTopico = this.executar((req, ctx) => this.service.definirPublicacao(ctx, String(req.params.id), true));
  despublicarTopico = this.executar((req, ctx) => this.service.definirPublicacao(ctx, String(req.params.id), false));
  duplicarTopico = this.executar((req, ctx) => this.service.duplicarTopico(ctx, String(req.params.id)), 201);
  excluirTopico = this.executar((req, ctx) => this.service.excluirTopico(ctx, String(req.params.id)), 204);

  criarPagina = this.executar((req, ctx) => this.service.criarPagina(ctx, String(req.params.id), req.body), 201);
  obterPagina = this.executar((req, ctx) => this.service.obterPagina(ctx, String(req.params.id)));
  atualizarPagina = this.executar((req, ctx) => this.service.atualizarPagina(ctx, String(req.params.id), req.body));
  salvarBlocos = this.executar((req, ctx) => this.service.salvarBlocos(ctx, String(req.params.id), req.body));
  dividirPagina = this.executar((req, ctx) => this.service.dividirPagina(ctx, String(req.params.id), req.body), 201);
  duplicarPagina = this.executar((req, ctx) => this.service.duplicarPagina(ctx, String(req.params.id)), 201);
  excluirPagina = this.executar((req, ctx) => this.service.excluirPagina(ctx, String(req.params.id)), 204);

  // Leitura do conteúdo publicado.
  conteudoDoAluno = this.executar((req, ctx) => this.service.conteudoDoAluno(ctx, String(req.params.turmaDisciplinaId)), 200, true);
  visualizarComoAluno = this.executar((req, ctx) => this.service.visualizarComoAluno(ctx, String(req.params.id)));
  paginaPublicada = this.executar((req, ctx) => this.service.paginaPublicada(ctx, String(req.params.id)), 200, true);

  // O arquivo já foi recebido e conferido pela rota; aqui só é registrado.
  enviarArquivo = async (req: Request, res: Response) => {
    const arquivo = req.file;
    let registrado = false;
    try {
      if (!arquivo) return res.status(400).json({ codigo: "DADOS_INVALIDOS", mensagem: "Arquivo é obrigatório." });
      const ctx = await this.auth.obterContexto(req);
      if (ctx.perfil === "aluno") throw erroConteudo.proibido();
      const resultado = await this.service.registrarArquivo(ctx, String(req.params.id), {
        nomeOriginal: arquivo.originalname,
        caminho: nomeEmDisco(arquivo.path),
        mime: arquivo.mimetype,
        tamanhoBytes: arquivo.size,
      });
      registrado = true;
      return res.status(201).json(resultado);
    } catch (e) {
      return this.erro(res, e);
    } finally {
      if (arquivo && !registrado) descartarArquivo(arquivo.path);
    }
  };

  // Entregue só com login (o editor busca com o token e exibe via blob).
  obterArquivo = async (req: Request, res: Response) => {
    try {
      const ctx = await this.auth.obterContexto(req);
      const arquivo = await this.service.obterArquivo(ctx, String(req.params.id));
      const emDisco = caminhoCompleto(arquivo.caminho);
      if (!fs.existsSync(emDisco)) {
        return res.status(404).json({ codigo: "NAO_ENCONTRADO", mensagem: "O arquivo não está mais disponível." });
      }
      res.setHeader("Content-Type", arquivo.mime);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(path.basename(arquivo.nome_original))}`,
      );
      return fs.createReadStream(emDisco).pipe(res);
    } catch (e) {
      return this.erro(res, e);
    }
  };
}
