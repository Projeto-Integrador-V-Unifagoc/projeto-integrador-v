# Seeds de desenvolvimento

O conjunto padrão foi organizado para ser executado integralmente e mais de uma vez:

```bash
npm run migrate
npm run seed
```

A seed `20260512000000_popular_banco.ts` recria a base demonstrativa e, por isso, deve permanecer antes dos cenários de relatórios, auditoria, competências e dashboards. As seeds posteriores complementam essa base sem apagá-la.

O comando é destinado a desenvolvimento e demonstração. Ele remove e recria dados acadêmicos demonstrativos. Não deve ser executado sobre uma base com dados reais. As seeds de dashboards e do núcleo acadêmico são ignoradas quando `NODE_ENV=production` ou `DEMO_SEEDS=false`.

## Usuários principais

| Perfil | Login | Senha |
| --- | --- | --- |
| Administrador | `suporte@unieduca.com.br` | `unieduca2026` |
| Secretaria | `secretaria@unieduca.com.br` | `unieduca2026` |
| Professor com dashboard | `professor1@unieduca.net.br` | `unieduca2026` |
| Aluna com dashboard | `ana.beatriz1@aluno.unieduca.net.br` | `unieduca2026` |
| Professora de auditoria e competências | `prof.helena.duarte@auditoria.unieduca.local` | `Unieduca@2026` |
| Aluno de auditoria | `aluno.ads01@auditoria.unieduca.local` | `Unieduca@2026` |

O cenário completo inclui cursos e disciplinas detalhados, matrizes vigente e em rascunho, requisitos curriculares, competências, avaliações mapeadas, planos de ensino, horários sem conflito, calendário, notas e frequências.
