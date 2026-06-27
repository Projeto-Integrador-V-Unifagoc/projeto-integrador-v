# Ambiente de produção — UniEduca

Este documento registra as decisões, a estrutura e os procedimentos usados para
publicar o UniEduca na VPS Ubuntu 24.04 LTS da Hostinger.

> Regra de manutenção: toda alteração futura na VPS, DNS, containers, Nginx,
> certificados, portas, rotas ou diretórios deve ser registrada neste arquivo.
> Senhas, tokens, chaves privadas e valores reais de segredos não devem ser
> documentados ou versionados.

## 1. Identificação do ambiente

| Item | Valor |
| --- | --- |
| Aplicação | UniEduca |
| Ambiente | Produção acadêmica |
| Domínio principal | `unieduca.net.br` |
| Domínio alternativo planejado | `www.unieduca.net.br` |
| Provedor | Hostinger |
| Sistema operacional | Ubuntu 24.04.4 LTS |
| IP público IPv4 | `72.60.156.85` |
| Repositório Git | `https://github.com/Projeto-Integrador-V-Unifagoc/projeto-integrador-v.git` |
| Runtime de containers | Podman 4.9.3 com compatibilidade `podman-docker` |
| Banco de dados | PostgreSQL 15 |

## 2. Nível de segurança adotado

Por ser um projeto acadêmico, será aplicada uma segurança proporcional e de
baixa complexidade operacional. O mínimo obrigatório será:

- acesso SSH preferencialmente por chave;
- desativação posterior do login SSH por senha e do login direto de `root`,
  somente depois que o acesso do usuário `ubuntu` for testado;
- firewall permitindo apenas SSH, HTTP e HTTPS publicamente;
- PostgreSQL acessível somente pela rede interna dos containers;
- Portainer sem acesso público irrestrito;
- HTTPS gratuito para o domínio;
- segredos armazenados em arquivo `.env` fora do Git;
- atualizações de segurança automáticas mantidas ativas;
- snapshot antes de alterações relevantes e backup periódico do banco.

Não serão adotadas, inicialmente, soluções mais complexas como VPN obrigatória,
cluster, alta disponibilidade ou gestão centralizada de segredos.

## 3. Estado encontrado em 25/06/2026

### Recursos

- 2 vCPUs;
- 8 GiB de RAM;
- disco de 100 GB, com aproximadamente 6% em uso;
- sem swap;
- carga baixa e nenhum serviço `systemd` em falha.

### Containers existentes

| Container | Função | Publicação encontrada |
| --- | --- | --- |
| `pi_frontend` | React servido por Nginx | `0.0.0.0:80 -> 80` |
| `pi_backend` | API Node/Express | sem porta pública no estado consultado |
| `pi_postgres_db` | PostgreSQL | `0.0.0.0:5432 -> 5432` |
| `portainer` | Administração dos containers | `0.0.0.0:8000` e `0.0.0.0:9443` |

### Pendências identificadas

- UFW inativo e política de entrada do host em `ACCEPT`;
- PostgreSQL, Portainer e SSH expostos à internet;
- SSH aceitando senha e login direto do usuário `root`;
- ataques automatizados de força bruta observados nos logs;
- 33 pacotes pendentes de atualização, incluindo kernel e runtime;
- ausência de HTTPS;
- Compose do repositório ainda publica PostgreSQL e backend;
- credenciais padrão do PostgreSQL presentes no Compose;
- backend configurado com `NODE_ENV=development`;
- imagem do Portainer usa a tag variável `latest`;
- frontend ainda possui URLs de API fixas em `localhost:3000`;
- configuração antiga referencia `unieduca.artifaetech.com.br`.

Os logins bem-sucedidos por senha encontrados vieram dos IPs
`143.255.164.207`, `191.208.123.21` e `191.208.122.192`. Eles precisam ser
reconhecidos pelos responsáveis pelo projeto. Os acessos por chave vindos de
`169.254.0.1` aparentam ser do console web da Hostinger.

## 4. Arquitetura de produção definida

O Nginx instalado no host será o único ponto público da aplicação:

```text
Internet
  |
  +-- unieduca.net.br:80/443
          |
          +-- Nginx do host
                 |
                 +-- /      -> frontend em 127.0.0.1:8080
                 +-- /api/  -> backend em 127.0.0.1:3000
                                      |
                                      +-- PostgreSQL na rede interna do Podman
```

Decisões:

- o navegador usará `/api` como URL-base da API;
- o Nginx removerá o prefixo `/api/` antes de encaminhar a requisição, pois as
  rotas atuais do Express estão na raiz, como `/alunos`, `/cursos` e `/login`;
- frontend e backend serão publicados apenas em `127.0.0.1`;
- PostgreSQL não terá `ports` no Compose;
- somente Nginx, SSH e os mecanismos internos necessários permanecerão
  acessíveis no host;
- `www.unieduca.net.br` redirecionará para `https://unieduca.net.br`.

## 5. Portas planejadas

| Porta | Exposição | Uso |
| --- | --- | --- |
| `22/tcp` | pública | SSH |
| `80/tcp` | pública | validação do certificado e redirecionamento HTTPS |
| `443/tcp` | pública | aplicação |
| `8080/tcp` | somente `127.0.0.1` | frontend |
| `3000/tcp` | somente `127.0.0.1` | backend |
| `5432/tcp` | somente rede dos containers | PostgreSQL |
| `9443/tcp` | restrita ou somente local | Portainer, se mantido |
| `8000/tcp` | fechada | Portainer Edge não será usado inicialmente |

## 6. Estrutura planejada na VPS

Já existe na VPS um diretório contendo uma cópia anterior do projeto no caminho absoluto `/root/projeto-integrador-v`. Essa cópia será tratada como **instalação legada** durante a configuração, sem ser alterada ou excluída prematuramente.

```text
/opt/unieduca/
├── app/                    # clone do repositório
├── .env                    # segredos e variáveis de produção; não versionado
└── backups/
    └── postgres/           # cópias lógicas do banco

/etc/nginx/
├── sites-available/
│   └── unieduca.net.br
└── sites-enabled/
    └── unieduca.net.br -> ../sites-available/unieduca.net.br

/var/log/nginx/
├── unieduca-access.log
└── unieduca-error.log
```

O código da aplicação ficará em `/opt/unieduca/app`. Dados persistentes do
PostgreSQL continuarão em volume gerenciado pelo Podman. O diretório de backup
não substitui um snapshot externo da Hostinger.

O código em `/opt/unieduca/app` será obtido do repositório oficial:

```text
https://github.com/Projeto-Integrador-V-Unifagoc/projeto-integrador-v.git
```

### Remoção da instalação legada

O diretório antigo será excluído somente após:

1. identificar e documentar seu caminho absoluto;
2. confirmar que não contém arquivos `.env`, uploads, backups ou dados que
   existam apenas nessa cópia;
3. confirmar que nenhum container, volume, serviço, cron ou configuração aponta
   para ele;
4. concluir o novo deploy em `/opt/unieduca/app`;
5. validar frontend, API, banco de dados, uploads e autenticação;
6. validar o acesso por `https://unieduca.net.br`;
7. criar um snapshot ou backup que permita recuperação;
8. obter confirmação final antes da exclusão.

A remoção e o caminho removido deverão ser adicionados ao registro de decisões.

## 7. DNS planejado na Hostinger

Os registros abaixo serão criados ou confirmados:

| Tipo | Nome | Destino |
| --- | --- | --- |
| `A` | `@` | `72.60.156.85` |
| `A` | `www` | `72.60.156.85` |

O registro `AAAA` só será publicado se o IPv6 da VPS for mantido e protegido
pelo firewall. Até essa validação, não é necessário criar `AAAA`.

Antes da emissão do certificado, deverão ser validados:

```bash
dig +short unieduca.net.br A
dig +short www.unieduca.net.br A
```

## 8. Configuração Nginx planejada

Arquivo: `/etc/nginx/sites-available/unieduca.net.br`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name unieduca.net.br www.unieduca.net.br;

    access_log /var/log/nginx/unieduca-access.log;
    error_log /var/log/nginx/unieduca-error.log;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Após a emissão do certificado, o Certbot ajustará os blocos para HTTPS. A
configuração final efetivamente aplicada será copiada para esta seção.

## 9. Variáveis de produção planejadas

O arquivo `/opt/unieduca/.env` deverá conter valores reais, sem ser versionado:

```dotenv
DATABASE_NAME=projeto_integrador
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<senha-forte>
JWT_SECRET=<segredo-aleatorio-com-pelo-menos-32-caracteres>
VITE_API_URL=/api
NODE_ENV=production
```

## 10. Ajustes necessários no repositório

Antes do próximo deploy:

1. remover `ports: 5432:5432` do PostgreSQL;
2. publicar o frontend como `127.0.0.1:8080:80`;
3. publicar o backend como `127.0.0.1:3000:3000`;
4. trocar credenciais fixas do banco por variáveis obrigatórias;
5. definir `NODE_ENV=production`;
6. usar `VITE_API_URL=/api`;
7. substituir URLs fixas `http://localhost:3000` encontradas em:
   - `frontend/src/services/conexao-api.ts`;
   - `frontend/src/services/usuario-api.ts`;
   - `frontend/src/components/EditFormCadastroAlunoMobile/EditFormCadastroAlunoMobile.tsx`;
   - `frontend/src/components/EditFormCadastroAlunoDesktop/EditFormCadastroAlunoDesktop.tsx`;
8. remover referências de produção a `unieduca.artifaetech.com.br`;
9. avaliar uma imagem de backend compilada, sem executar TSX em produção;
10. adicionar healthchecks ao backend e frontend.

## 11. Sequência de implantação

- [x] Auditar sistema, recursos, portas e containers.
- [x] Auditar firewall, SSH, logins, serviços e tarefas agendadas.
- [ ] Confirmar que todos os IPs de login bem-sucedido são conhecidos.
- [ ] Criar snapshot da VPS no painel da Hostinger.
- [x] Identificar e registrar o caminho da instalação legada.
- [x] Verificar se a instalação legada contém dados exclusivos.
- [x] Configurar e testar chave SSH para o usuário `ubuntu`.
- [ ] Aplicar endurecimento mínimo do SSH.
- [x] Corrigir o Compose e as URLs fixas do frontend.
- [x] Fechar PostgreSQL e Portainer para acesso público.
- [x] Ativar firewall com portas `22`, `80` e `443`.
- [x] Atualizar os pacotes e reiniciar a VPS.
- [x] Configurar os registros DNS de `unieduca.net.br`.
- [x] Instalar e configurar o Nginx no host.
- [x] Emitir certificado TLS com Certbot.
- [x] Executar testes funcionais pelo domínio.
- [ ] Configurar e testar backup do PostgreSQL.
- [ ] Excluir a instalação legada após validação e confirmação final.

## 12. Registro de decisões

### 25/06/2026

- definido que a proteção será proporcional a um projeto acadêmico;
- definido `unieduca.net.br` como domínio principal;
- definido Nginx no host como proxy reverso e terminador TLS;
- definido `/api` como prefixo público da API;
- definido que banco e serviços administrativos não ficarão públicos;
- definido `/opt/unieduca` como diretório-base de produção;
- registrado como repositório oficial
  `https://github.com/Projeto-Integrador-V-Unifagoc/projeto-integrador-v.git`;
- registrado que a cópia antiga do projeto será preservada durante a
  configuração e removida somente após a validação completa do novo ambiente;
- instituída a obrigatoriedade de documentar todas as mudanças futuras neste
  arquivo.
