# Seed manual de recriação da base de demonstração

`popular_banco.ts` foi retirado do lote padrão (`npm run seed`) porque exclui
registros de tabelas acadêmicas antes de popular a base. Executá-lo depois dos
seeds de relatórios e auditoria apagaria vínculos com notas e falharia por
restrições de integridade.

Em uma base de demonstração **isolada**, com migrations e seed de cidades já
aplicados, o comando explícito é `npm run seed:recriar-demo`. Ele recria dados
acadêmicos e não deve ser usado para atualizar uma base com registros a
preservar. Confira o destino e tenha um backup restaurável antes da execução.

Para o preparo padrão do QA, execute as migrations e depois `npm run seed`.
Esse lote cria o usuário institucional antes das demos e não inclui o seed de
recriação.
