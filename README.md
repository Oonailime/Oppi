# Estuda

Aplicação de preparação para concursos com:

- `apps/web`: frontend Next.js
- `apps/api`: API NestJS
- `postgres`: banco usado pela API
- autenticação por usuário e senha;
- espaços de estudo separados por concurso.

## Acesso inicial

Os dados que já existiam foram migrados para:

```text
Usuário: Emiliano
Senha: 123
```

A senha é armazenada somente como hash. Depois do login, o sistema exige a
escolha de um concurso antes de abrir a visão geral. O concurso inicial é
`DATAPREV 2026`; tentativas, progresso do plano e tempo estudado pertencem a
esse concurso e ao seu usuário.

Na tela de escolha também é possível criar outros concursos. Um concurso novo
começa com histórico e tempo zerados. Os conteúdos específicos de um novo
edital podem ser carregados posteriormente sem misturar o progresso existente.

## Pre-requisitos

- Node.js `22+`
- npm
- Docker Desktop ou Docker Engine com `docker compose`

## Portas usadas

- Web: `3000`
- API: `3001`
- Postgres do projeto: `5433`

O banco foi configurado em `5433` para evitar conflito com outros containers locais que usem `5432`.

## Arquivos de ambiente

Crie estes arquivos com os valores abaixo.

Raiz do projeto, arquivo `.env`:

```env
DATABASE_URL="postgresql://dataprev:dataprev@localhost:5433/dataprev?schema=public"
PORT=3001
WEB_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

API, arquivo `apps/api/.env`:

```env
DATABASE_URL="postgresql://dataprev:dataprev@localhost:5433/dataprev?schema=public"
PORT=3001
WEB_ORIGIN="http://localhost:3000"
```

Web, arquivo `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

## Instalar dependencias

```bash
npm install
```

## Subir o banco

```bash
docker compose up -d
```

## Preparar o banco

Gera o client do Prisma, aplica migracoes e carrega os dados iniciais.

```bash
npm run setup
```

Esse comando também cria ou atualiza o usuário inicial `Emiliano`, associa os
409 tópicos do plano ao concurso DATAPREV 2026 e mantém tentativas já
existentes durante a migração.

## Rodar em desenvolvimento

```bash
npm run dev
```

Esse comando sobe:

- Next.js em `http://localhost:3000`
- NestJS em `http://localhost:3001/api`

### Inicializador Estuda

No Windows, execute com duplo clique:

```text
Iniciar Estuda.cmd
```

O inicializador pergunta a porta do site e a porta da API, inicia o Postgres,
frontend e backend e abre o navegador somente quando os dois servicos estiverem
prontos. A primeira compilacao da API pode levar cerca de dois minutos. Os
valores padrao sao:

- site: `http://estuda.local:4000`;
- API: `http://estuda.local:4001/api`.

Tambem e possivel informar as portas sem perguntas:

```bat
"Iniciar Estuda.cmd" 4500 4501
```

Pelo terminal Linux ou WSL, use:

```bash
npm run dev:estuda -- --web-port=4500 --api-port=4501
```

Na primeira execucao, o Windows solicita permissao de administrador para
adicionar `127.0.0.1 estuda.local` ao arquivo `hosts`. Essa configuracao e
feita uma unica vez, pelo mesmo mecanismo usado pelo Local para os sites
WordPress com dominio `.local`. O dominio `.dev` nao e usado porque os
navegadores exigem HTTPS para ele, o que tambem exigiria instalar um
certificado local.

## Comandos uteis

```bash
npm run build
npm run lint
npm run test
```

## Provas e controle de tempo

As provas atualmente cadastradas sao:

- DATAPREV 2024: 70 questoes;
- STN 2024 - Tecnologia da Informacao (Operacao e Infraestrutura): 70 questoes;
- EBSERH 2024 - Analista de Tecnologia da Informacao: 60 questoes;
- SERPRO 2023 - Analista de Tecnologia: 120 itens;
- BACEN 2024 - Analista de Tecnologia da Informacao: 120 itens;
- BNDES 2024 - Analise de Sistemas (Suporte): 70 questoes.

O cadastro fica na entidade `Exam`, e cada questao usa uma numeracao propria
dentro da prova. Isso permite adicionar outros concursos com questoes de
numeros repetidos sem misturar tentativas ou estatisticas. SERPRO e BACEN usam
itens de certo/errado e, por isso, exibem apenas as alternativas `C` e `E`.

Ao iniciar um simulado, escolha no site:

- a prova;
- o modo completo ou por disciplina;
- o tempo oficial da prova ou esse tempo acrescido de uma hora.

EBSERH e BNDES usam `4h/5h`; SERPRO e BACEN usam `3h30/4h30`.
DATAPREV e STN permanecem configuradas com `4h/5h`.

O sistema calcula a media permitida por questao com base no tempo escolhido,
registra quanto tempo cada questao ficou aberta e sinaliza as que ultrapassaram
essa media. O tempo nao avanca enquanto a aba do navegador estiver oculta.

O plano de estudos tambem gera, para cada assunto, links especificos de
videoaulas gratuitas no YouTube. Quando ha um detalhamento do topico, um
segundo link de aprofundamento e exibido.

## Extracao das provas

Os arquivos-fonte ficam em `provas/`. Para regenerar os dados e as imagens:

```bash
npm run source:extract
npm run source:extract:stn
npm run source:extract:added
```

O extrator da STN le diretamente o caderno CNS104 tipo 1 e a secao
correspondente do PDF de gabaritos. Ele gera:

- `apps/api/prisma/data/stn-2024-questions.json`;
- `apps/web/public/questions/stn-2024/`;
- o texto-base compartilhado pelas questoes 36 a 39.

O comando `source:extract:added` processa os cadernos objetivos e gabaritos de
EBSERH 2024, SERPRO 2023, BACEN 2024 e BNDES 2024. Ele gera os quatro arquivos
JSON em `apps/api/prisma/data/`, os recortes individuais em
`apps/web/public/questions/<prova>/` e as imagens de contexto compartilhado.
Provas discursivas nao sao importadas.

O manifesto `apps/api/prisma/data/exams.json` define quais provas e arquivos de
questoes sao carregados pelo seed.

## Parar o ambiente

Para encerrar a aplicacao em desenvolvimento, interrompa o terminal com `Ctrl+C`.

Para derrubar o banco:

```bash
docker compose down
```
