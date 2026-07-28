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

Na tela de escolha, `Solicitar concurso` coleta nome, data, área, descrição,
três PDFs obrigatórios e as provas internas que o usuário gostaria de
reaproveitar. A tela prepara uma mensagem para
`emilianocalado@hotmail.com`; por segurança do navegador, os PDFs precisam ser
anexados manualmente no aplicativo de e-mail antes do envio. Nenhum concurso é
criado automaticamente e o endpoint de criação direta permanece desativado
até a implementação da próxima versão.

O seed também cria o `ENEM`, do tipo `ConcursoRecorrente`, com as edições de
2016 a 2025. Em `Prova por ano`, o usuário escolhe Dia 1 ou Dia 2 e resolve as
90 questões objetivas correspondentes. O `Treino por disciplina` reúne apenas
a matéria escolhida nas dez edições. As 1.850 linhas armazenadas — incluindo
as duas variantes de idioma — estão relacionadas a 17 disciplinas e a 99
tópicos do plano oficial de 2026.

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
409 tópicos do plano ao concurso DATAPREV 2026, associa os 99 tópicos da Matriz
de Referência do ENEM 2026 ao concurso recorrente e mantém tentativas já
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
- ENEM 2016 a 2025 - caderno azul: dois dias com 90 questoes efetivas cada.

O cadastro fica na entidade `Exam`, e cada questao usa uma numeracao propria
dentro da prova. Isso permite adicionar outros concursos com questoes de
numeros repetidos sem misturar tentativas ou estatisticas. SERPRO e BACEN usam
itens de certo/errado e, por isso, exibem apenas as alternativas `C` e `E`.

Ao iniciar um simulado, escolha no site:

- a prova;
- o modo completo ou por disciplina;
- o tempo oficial da prova ou esse tempo acrescido de uma hora.

No `ConcursoRecorrente` ENEM, os modos são `Prova por ano` e
`Treino por disciplina`. No primeiro, a edição abre as opções Dia 1 e Dia 2,
cada uma com exatamente 90 questões. O sistema preserva a distribuição
histórica: em 2016 a redação estava no Dia 2; de 2017 em diante, está no Dia 1.
No dia com redação, uma hora do tempo oficial é reservada para a produção
textual e retirada do cronômetro das questões objetivas.

Os tempos objetivos configurados são:

- 2016: Dia 1 `4h30`; Dia 2 `4h30` após reservar `1h` para a redação;
- 2017: Dia 1 `4h30` após a reserva; Dia 2 `4h30`;
- 2018 a 2025: Dia 1 `4h30` após a reserva; Dia 2 `5h`.

Cada opção de tempo adicional acrescenta uma hora ao cronômetro objetivo. A
distribuição atual e os totais oficiais de `5h30` no Dia 1 e `5h` no Dia 2
seguem as orientações do Inep:
`https://www.gov.br/inep/pt-br/acesso-a-informacao/perguntas-frequentes/exame-nacional-do-ensino-medio-enem/no-dia-do-exame-orientacoes/em-que-horario-serao-aplicadas`.

O `Treino por disciplina` reúne questões da mesma matéria entre 2016 e 2025,
oferece ritmos de três ou quatro minutos por questão e persiste a lista e a
ordem exatas da tentativa.

EBSERH e BNDES usam `4h/5h`; SERPRO e BACEN usam `3h30/4h30`.
DATAPREV e STN permanecem configuradas com `4h/5h`.

O sistema calcula a media permitida por questao com base no tempo escolhido,
registra quanto tempo cada questao ficou aberta e sinaliza as que ultrapassaram
essa media. O tempo nao avanca enquanto a aba do navegador estiver oculta.

## Rascunhos e problemas nas questões

Tentativas ainda não finalizadas aparecem em `Simulados em andamento`. Durante
a resolução, respostas marcadas, questão atual, tempo total e tempo por questão
são preservados no navegador e sincronizados com o PostgreSQL a cada cinco
segundos. O botão `Continuar depois` força uma última sincronização antes de
voltar à central de treino. Ao retomar, o cronômetro parte do tempo acumulado e
não inclui o período em que o simulado permaneceu fechado.

Cada questão possui a ação `Reportar problema`, disponível durante a resolução
e na revisão do resultado. As categorias incluem imagem cortada ou ilegível,
categoria incorreta, erro de gabarito, texto ou alternativas incompletos,
duplicidade, numeração incorreta e outros erros. A ação prepara uma mensagem
para `emilianocalado@hotmail.com` com ID, prova, ano, dia, número, disciplina,
assunto, página, imagem, tentativa e usuário. O envio é confirmado pelo usuário
no aplicativo de e-mail.

O plano de estudos tambem gera, para cada assunto, links especificos de
videoaulas gratuitas no YouTube. Quando ha um detalhamento do topico, um
segundo link de aprofundamento e exibido.

## Extracao das provas

Os arquivos-fonte ficam em `provas/`. Para regenerar os dados e as imagens:

```bash
npm run source:extract
npm run source:extract:stn
npm run source:extract:added
npm run source:extract:enem
npm run source:categorize:enem
npm run source:study-plan:enem
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

O comando `source:extract:enem` processa prova e gabarito azuis dos dois dias,
separa as alternativas de inglês e espanhol, identifica anuladas, categoriza
as questões por disciplina e preserva o leiaute original em imagens. As fontes ficam em
`enem/<ano>/`, os 1.850 registros em
`apps/api/prisma/data/enem-<ano>-questions.json`, e os recortes em
`apps/web/public/questions/enem-<ano>/`. O relatório reproduzível de validação
fica em `enem/extraction-validation.json`.

`source:categorize:enem` reaplica a taxonomia às dez edições sem renderizar as
imagens novamente. `source:study-plan:enem` gera os 99 tópicos de Linguagens,
Redação, Matemática, Ciências da Natureza e Ciências Humanas a partir dos
objetos de conhecimento da Matriz de Referência publicada pelo Inep em 2026.
O edital disciplina a edição do exame, enquanto a Matriz é a publicação
oficial que enumera competências, habilidades e objetos de conhecimento:

- edital e retificações:
  `https://www.gov.br/inep/pt-br/centrais-de-conteudo/legislacao/enem`;
- Matriz de Referência ENEM 2026:
  `https://www.gov.br/inep/pt-br/centrais-de-conteudo/acervo-linha-editorial/publicacoes-institucionais/avaliacoes-e-exames-da-educacao-basica/matrizes-de-referencia-enem`.

Enquanto a criação direta estiver desativada, os PDFs selecionados na
solicitação não são armazenados pelo sistema nem entram no Git.

O manifesto `apps/api/prisma/data/exams.json` define quais provas e arquivos de
questoes sao carregados pelo seed.

## Parar o ambiente

Para encerrar a aplicacao em desenvolvimento, interrompa o terminal com `Ctrl+C`.

Para derrubar o banco:

```bash
docker compose down
```
