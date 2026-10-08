# Notas e resultado acadêmico

Módulo integrado ao PostgreSQL `piv`. A API ativa usa avaliações, regras por curso/período, matrículas, notas e frequência reais da base autorizada. Os arquivos de mocks antigos não alimentam as rotas ativas de notas. Execução sintética, comandos e isolamento: [quickstart](../../../../specs/001-notas-dinamicas/quickstart.md).

## Contratos e permissões

[REST completo](../../../../specs/001-notas-dinamicas/contracts/api.md) e [DTO resultadoAcademico v2](../../../../specs/001-notas-dinamicas/contracts/resultado-academico.md) são as referências de integração. Pontos são strings decimais estritas, com até duas casas na entrada e duas na saída; zero lançado é `"0.00"`, ausência é null. Percentuais nullable são projeções para exibição. O corte exato é60% do total; plano e notas regulares devem estar completos, e aprovação conjunta exige também frequência suficiente (75% segundo a fórmula vigente). REC usa o maior resultado, sem somar pontos e sem suprir faltas.

Todas as rotas abaixo exigem autenticação. Secretaria/administrador têm alcance administrativo; professor somente suas ofertas; aluno somente seus vínculos. Ficha é exclusiva administrativa. Permissão e escopo são validados antes da leitura e novamente nos locks da escrita.

| Rota | Uso |
| --- | --- |
| GET /notas/opcoes | Ofertas/avaliações autorizadas para lançamento |
| GET /notas/avaliacoes/:avaliacaoId/lancamento | Grade, máximo textual, null/zero, prazos e permissões |
| PUT /notas/avaliacoes/:avaliacaoId/lote | Lote atômico de `{itens:[{alunoId,valor:"18.00"}],motivo}` |
| GET /notas/turmas/:turmaDisciplinaId/rendimento | Resultado comum por matrícula/oferta |
| GET /notas/turmas/:turmaDisciplinaId/recuperacao | Elegíveis por nota e avaliação REC, quando aplicável |
| POST /notas/autorizacoes-excepcionais | Exceção de retificação por secretaria/administrador; não reabre período |
| GET /notas/me e /notas/me/resumo | Boletim e resumo do aluno autenticado |
| GET /notas/alunos/:alunoId | Administrativo, próprio aluno ou ofertas do professor autorizado |

O GET recuperação conserva o efeito herdado de materializar avaliação quando há elegível e período aberto. Não usar prefetch: resposta `Cache-Control: private, no-store`, máximo igual ao total da regra e unicidade por oferta. A UI solicita ao abrir o fluxo explicitamente. Lote REC revalida completude/elegibilidade, período, prazo e vínculo sob lock.

Configuração fica em `/regras-pontuacao/cursos/:cursoId/periodos/:periodoLetivoId`; plano em `/avaliacoes/plano/:turmaDisciplinaId`. Novo cadastro regular usa `tipo_avaliacao:"REGULAR"` e `subgrupo_id` da regra, sem default100. Regra é preservada no primeiro uso, mesmo apagando avaliação sem nota; máximo/subgrupo/oferta/finalidade da avaliação são preservados após a primeira nota. Datas/descrição e retificação seguem o fluxo vigente.

## Composição e erros

`ResultadoAcademicoService` coordena estrutura autorizada, plano, notas e frequência em snapshot único e consultas em lote. O cálculo puro trabalha em centésimos exatos, não consulta banco/perfil e não refaz frequência. Boletim, rendimento, ficha, relatório e Home usam o mesmo resultado por UUID; aliases antigos não decidem aprovação conjunta.

Erro de domínio retorna status apropriado, codigo/mensagem e campos autorizados. Lote inválido não grava parte dos itens nem eventos. Falha inesperada retorna500 opaco, sem SQL/payload de terceiros e sem converter indisponibilidade em zero/ausência. Matrícula, avaliação, oferta, regra e pais são revalidados segundo a precedência transacional comum; triggers protegem escritores diretos.

Falhas internas de notas recebem `X-Request-ID` gerado no servidor e evento técnico mínimo para diagnóstico. Somente operação/correlação/classificação/código permitido são registrados; nenhum objeto do driver, mensagem, SQL, payload, URL, stack ou identidade é serializado. Erros de domínio mantêm seu contrato.

## Ativação e retorno

Este contrato quebra a representação numérica antiga, exige subgrupo em regulares e atualização coordenada dos consumidores. [Adoção e retorno](../../../../specs/001-notas-dinamicas/adocao-e-retorno.md) descreve as três migrations novas, preflight somente leitura, suspensão de escritores, backups e gates de ambiente. Adoção/retorno foram ensaiados em histórico sintético, com manifestos; não houve operação real. Histórico incompatível bloqueia o conjunto inteiro, sem saneamento ou replay de migrations normalizadoras antigas.
