# Discussões sobre arquitetura e hospedagem

Data da conversa: **13 de agosto de 2026**

Este documento consolida as discussões realizadas sobre hospedagem gratuita,
requisitos mínimos, separação entre backend e banco de dados e adoção do padrão
Backend for Frontend (BFF) no projeto Oppi.

## 1. É possível publicar o programa gratuitamente?

### Pergunta

> Consigo subir um site gratuitamente com o funcionamento desse programa? Ou
> precisaria modificar o código? Gostaria de saber os requisitos mínimos para
> rodar ele adequadamente.

### Arquitetura identificada

O programa não é apenas um site estático. Ele possui três componentes de
execução:

```text
Frontend Next.js
       |
       | HTTPS/API
       v
Backend NestJS
       |
       | Prisma
       v
PostgreSQL
```

- `apps/web`: frontend em Next.js 16;
- `apps/api`: API em NestJS 11;
- PostgreSQL 17 como banco de dados;
- Prisma como camada de acesso ao banco;
- autenticação por usuário, senha, sessão persistida no banco e cookie HTTP;
- imagens das questões servidas pelo frontend;
- tentativas, rascunhos, progresso e sessões de estudo persistidos no banco.

Portanto, uma hospedagem que aceite somente HTML, CSS e JavaScript estáticos não
é suficiente para executar o sistema completo sem manter a API e o banco em
outros serviços.

### Conclusão

É possível hospedá-lo gratuitamente para uso pessoal ou pequeno volume de
acessos. A combinação sugerida foi:

| Componente | Plataforma sugerida | Papel |
| --- | --- | --- |
| Frontend Next.js | Vercel Hobby | Interface e distribuição das imagens |
| API NestJS | Render Free | Processamento das requisições e regras da aplicação |
| PostgreSQL | Neon Free | Persistência das informações |

Essa composição tem limitações próprias de planos gratuitos:

- o serviço gratuito do Render entra em suspensão depois de 15 minutos sem
  requisições e pode levar aproximadamente um minuto para despertar;
- a instância gratuita do Render oferece 512 MB de RAM e 0,1 CPU;
- o Neon Free oferece 0,5 GB de armazenamento por projeto e computação que pode
  escalar a zero quando o banco fica ocioso;
- os limites e condições comerciais dessas plataformas podem mudar;
- esse arranjo é adequado a projeto pessoal e demonstração, mas não representa
  uma infraestrutura com SLA de produção.

### Modificações necessárias antes da publicação

#### 1. Comunicação entre frontend e API

Atualmente o frontend usa `NEXT_PUBLIC_API_URL` e pode acessar a API em outro
domínio. Ele também envia cookies com `credentials: "include"`.

Em produção, a opção mais confiável é fazer o navegador acessar apenas caminhos
do mesmo domínio:

```text
https://oppi.exemplo.com/api/*
```

Um rewrite ou proxy encaminharia internamente essas requisições para a API no
Render. No frontend, a URL base passaria a ser relativa:

```ts
export const API_URL = "/api";
```

Isso simplifica cookies, CORS e a troca futura do endereço real do backend.

#### 2. Senha inicial

O seed atual cria o usuário `Emiliano` com a senha `123` e redefine essa senha
quando é executado. Isso não deve ser publicado.

A senha inicial deve vir de um segredo de implantação, e o seed não deve
sobrescrever uma senha já alterada. Também são recomendados:

- rate limiting no login;
- política de senha adequada;
- registro de tentativas suspeitas;
- mecanismo de troca ou recuperação de senha se houver outros usuários.

#### 3. Migrações de produção

O comando atual usa `prisma migrate dev`, que é destinado ao desenvolvimento.
Na implantação deve ser usado:

```bash
prisma migrate deploy
```

O seed deve ser executado separadamente e apenas quando necessário.

#### 4. Gravações em arquivos locais

O recurso **Reportar problema** grava os relatos no arquivo
`apps/api/data/reported-question-errors.json`. O sistema de arquivos do Render
Free é efêmero: alterações locais podem desaparecer quando a instância reinicia,
é suspensa ou recebe uma nova implantação.

Os relatos devem ser migrados para uma tabela `QuestionReport` no PostgreSQL.
Uploads futuros de PDFs ou imagens devem usar armazenamento de objetos, como S3
ou Cloudflare R2, em vez do disco local da API.

A criação direta de concursos e o recebimento de seus PDFs já estão desativados
na versão atual; a interface prepara uma solicitação por e-mail. Portanto, os
uploads locais não participam hoje do fluxo público normal.

#### 5. Arquivos estáticos

Foram encontrados:

- 2.385 arquivos de imagem em `apps/web/public`;
- aproximadamente 336 MB de imagens usadas pelo site;
- aproximadamente 128 MB de PDFs-fonte em `provas/` e `enem/`;
- aproximadamente 1 MB de arquivos JSON usados pelo seed.

Os PDFs-fonte são necessários para extração e manutenção dos dados, mas não para
o runtime normal do site. Eles devem ficar fora do artefato de produção.

As imagens podem continuar no frontend e ser entregues por CDN. Caso os limites
da hospedagem ou do repositório se tornem inconvenientes, elas podem ser movidas
para armazenamento de objetos. Isso também evita consumir o tráfego da API com
arquivos pesados.

### Requisitos mínimos medidos

Foi feita uma medição dos processos de produção praticamente ociosos:

| Componente | Memória observada |
| --- | ---: |
| Next.js | aproximadamente 128 MB |
| NestJS | aproximadamente 119 MB |
| PostgreSQL | aproximadamente 34 MB |
| Total aproximado | 281 MB |

O banco local ocupava aproximadamente 12 MB e continha:

- 1 usuário;
- 2.360 questões;
- 48 tentativas no momento da medição.

Os valores representam um cenário ocioso e não incluem picos de compilação,
acessos concorrentes, cache do sistema operacional ou crescimento futuro.

Para executar tudo em uma única máquina:

| Recurso | Mínimo adequado | Recomendado |
| --- | ---: | ---: |
| CPU | 1 vCPU | 2 vCPUs |
| RAM | 1 GB | 2 GB |
| Disco SSD | 10 GB | 20 GB |
| Node.js | 22 ou superior | versão LTS 22 ou 24 |
| PostgreSQL | 17 | 17 |
| Sistema operacional | Linux 64 bits | Ubuntu ou Debian |
| Exposição | HTTPS | Caddy ou Nginx como proxy reverso |

Embora o runtime caiba teoricamente em menos de 512 MB, executar frontend,
backend, banco e compilação juntos com essa memória não oferece margem segura.
Para compilar o Next.js na própria máquina, recomenda-se pelo menos 2 GB de RAM
ou memória swap disponível.

### Alternativa em uma única VM gratuita

Também foi discutida a Oracle Cloud Always Free. Uma VM poderia executar
Next.js, NestJS e PostgreSQL juntos, preservando quase toda a arquitetura atual.
Segundo a documentação consultada na data da conversa, a franquia ARM Always
Free equivalia a até 2 OCPUs e 12 GB de RAM, com 200 GB de Block Volume
compartilhado entre os recursos elegíveis.

As desvantagens são:

- administração manual do servidor;
- configuração de firewall, HTTPS, atualizações e backups;
- possível indisponibilidade de capacidade gratuita na região;
- cadastro normalmente sujeito a verificação por cartão;
- maior responsabilidade operacional.

Resumo da escolha:

- **Vercel + Render + Neon:** mais simples de administrar, mas com cold start e
  serviços distribuídos;
- **VM Oracle Always Free:** mais recursos e controle, mas exige administrar o
  servidor;
- **infraestrutura paga:** indicada quando disponibilidade, suporte, backups e
  crescimento passam a ser requisitos formais.

## 2. É comum o banco ficar em uma plataforma diferente do backend?

### Pergunta

> Em arquitetura robusta é comum o banco ficar em plataforma diferente do
> backend?

### Resposta consolidada

É comum e recomendável que banco e backend sejam **serviços separados**. Isso
não significa necessariamente que devam pertencer a empresas diferentes.

O desenho usual é:

```text
Frontend -> Backend/API -> Banco gerenciado
```

Separar os serviços permite:

- atualizar e escalar a API sem interromper o banco;
- manter os dados fora do ciclo de vida dos containers da aplicação;
- executar backups e restaurações independentes;
- limitar credenciais e acesso à rede;
- ajustar CPU, memória e armazenamento de cada componente separadamente.

Em uma infraestrutura robusta, é preferível que backend e banco estejam:

- na mesma região geográfica;
- conectados por rede privada ou VPC;
- usando conexão criptografada;
- com o banco indisponível diretamente para a internet, quando possível;
- usando pool de conexões;
- com backups automáticos e restauração testada;
- monitorados quanto a latência, conexões e capacidade.

Usar empresas diferentes, como Render para a API e Neon para o PostgreSQL,
também é válido, especialmente em projetos pequenos e médios. Os custos dessa
decisão são:

- tráfego entre provedores pela internet pública;
- latência potencialmente maior;
- possibilidade de cobrança de transferência;
- monitoramento e credenciais em duas plataformas;
- dependência da disponibilidade de ambos os provedores;
- controles de rede privada mais difíceis.

Assim, a recomendação discutida foi:

- para uso pessoal gratuito, **Render + Neon** é aceitável;
- para produção com maior exigência, preferir API e banco na mesma região e,
  quando disponível, no mesmo provedor com rede privada;
- o frontend pode continuar separado em uma CDN ou na Vercel, pois somente a API
  deve possuir as credenciais do banco.

Separar banco e backend é uma decisão arquitetural saudável. Colocá-los em
provedores diferentes é uma decisão de custo, disponibilidade e conveniência,
não uma obrigação para obter robustez.

## 3. O que mudaria para transformar a API em um BFF?

### Pergunta

> O que teria que mudar para transformar a API em um BFF?

### Situação atual

A API NestJS já atua, em grande parte, como um Backend for Frontend voltado ao
site. Ela:

- autentica o usuário;
- mantém sessões;
- aplica o contexto do concurso selecionado;
- executa regras de simulados, pontuação e tempo;
- consulta e atualiza o PostgreSQL;
- devolve objetos preparados para as telas.

O fluxo atual é:

```text
Navegador -> NestJS -> Prisma -> PostgreSQL
```

Por isso, transformar a API existente em BFF não requer uma reescrita. A mudança
principal seria formalizar seu papel como a única interface pública usada pelo
frontend.

### Arquitetura proposta

```text
Navegador
    |
    | HTTPS no mesmo domínio
    v
/api -> BFF NestJS
            |
            | Prisma
            v
        PostgreSQL
```

O frontend não conheceria o endereço interno da API ou as credenciais de outros
serviços.

### Mudanças recomendadas

#### 1. API relativa e proxy no mesmo domínio

O frontend chamaria apenas `/api`. Vercel, Nginx ou Caddy encaminharia as
requisições para o NestJS. Isso torna o endereço interno substituível e
simplifica cookies e CORS.

#### 2. Sessão controlada pelo BFF

A API já cria uma sessão no PostgreSQL e envia um cookie `HttpOnly`. Para
completar esse desenho seriam adicionados:

- cookie `Secure` em produção;
- proteção CSRF nas operações que alteram dados;
- rate limiting, especialmente no login;
- invalidação e rotação de sessões;
- nenhuma exposição do token ao JavaScript;
- validação do cabeçalho `Origin` quando aplicável.

#### 3. Concurso selecionado na sessão

Hoje o frontend guarda o concurso selecionado no navegador e envia
`X-Contest-Id` a cada chamada. Um BFF mais completo poderia guardar
`activeContestId` em `AuthSession`.

```text
AuthSession
|- userId
|- activeContestId
|- tokenHash
`- expiresAt
```

Mesmo assim, o backend continuaria validando se o concurso pertence ao usuário.
Essa mudança é útil, mas não obrigatória para chamar a API de BFF.

#### 4. Endpoints orientados às telas

Em vez de obrigar cada tela a coordenar muitas chamadas pequenas, o BFF pode
agregar informações:

```text
GET /api/home
GET /api/simulation-setup
GET /api/simulations/:id
GET /api/results/:id
GET /api/study-plan
```

Por exemplo, `/api/home` poderia devolver em uma única resposta:

- usuário autenticado;
- concurso ativo;
- estatísticas principais;
- simulados em andamento;
- progresso recente.

O `DashboardService` existente já segue parcialmente essa ideia. Não é
necessário incluir a palavra `bff` nas URLs; BFF descreve a responsabilidade da
camada, não sua nomenclatura.

#### 5. Separação interna de responsabilidades

Alguns serviços atuais misturam consulta ao Prisma, regra de negócio e montagem
da resposta da interface. Uma evolução gradual seria:

```text
Controller/BFF
      |
      v
Serviço de aplicação
      |
      v
Domínio e regras
      |
      v
Repositório Prisma
```

O BFF ficaria responsável por:

- autenticação e contexto do usuário;
- validação da requisição;
- agregação das operações necessárias à tela;
- DTOs específicos da experiência web;
- tradução de erros internos para respostas HTTP consistentes.

As regras de pontuação, sorteio, duração e progresso permaneceriam em serviços
independentes e testáveis.

#### 6. Persistência compatível com múltiplas instâncias

Relatos de questões devem sair do JSON local e ir para o PostgreSQL. Arquivos
recebidos futuramente devem ir para armazenamento de objetos. Dessa forma,
qualquer instância do BFF terá acesso ao mesmo estado.

#### 7. Operação em produção

A implantação do BFF deve incluir:

- variáveis de ambiente e segredos;
- HTTPS;
- proxy de `/api`;
- `prisma migrate deploy`;
- health check;
- encerramento gracioso das conexões;
- logs estruturados;
- limites de corpo das requisições;
- rate limiting;
- backups e restaurações testadas.

### BFF no NestJS ou no Next.js?

Foram consideradas duas opções.

#### Manter o NestJS como BFF — opção recomendada

```text
Next.js/Vercel -> proxy /api -> NestJS -> PostgreSQL
```

Essa opção preserva os serviços, testes e regras existentes e exige poucas
mudanças.

#### Criar um segundo BFF dentro do Next.js

```text
Navegador -> Route Handlers do Next.js -> NestJS interno -> PostgreSQL
```

Seriam criados Route Handlers como:

```text
apps/web/app/api/auth/login/route.ts
apps/web/app/api/dashboard/route.ts
apps/web/app/api/simulations/route.ts
```

Essa camada adicional seria justificável se existissem vários backends,
integrações externas complexas ou experiências muito diferentes para web e
aplicativo móvel. No estado atual, aumentaria a complexidade sem benefício
proporcional.

### Conclusão sobre o BFF

A decisão recomendada foi tratar o NestJS existente como o BFF do site e evoluí-lo
incrementalmente:

1. o frontend chama somente `/api`;
2. um proxy mantém frontend e API sob o mesmo domínio;
3. a autenticação é reforçada;
4. relatos são migrados do JSON para o PostgreSQL;
5. endpoints são agregados conforme as necessidades das telas;
6. DTOs do frontend, regras de negócio e acesso Prisma são separados
   gradualmente.

Não foi recomendada a criação de uma segunda API dentro do Next.js neste
momento.

## 4. Referências consultadas na conversa

- [Render: serviços gratuitos](https://render.com/docs/free)
- [Render: tipos de instância](https://render.com/docs/compute-plans)
- [Render: tráfego de saída](https://render.com/docs/outbound-bandwidth)
- [Neon: preços e limites](https://neon.com/pricing)
- [Vercel: plano Hobby](https://vercel.com/docs/plans/hobby)
- [Vercel: limites](https://vercel.com/docs/limits)
- [Vercel: rewrites e proxy reverso](https://vercel.com/docs/routing/rewrites)
- [Next.js: exportação estática](https://nextjs.org/docs/pages/guides/static-exports)
- [Oracle Cloud: recursos Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Cloudflare Pages: limites](https://developers.cloudflare.com/pages/platform/limits/)

As ofertas gratuitas e seus limites devem ser conferidos novamente antes de uma
implantação, pois podem mudar sem que o código do projeto seja alterado.

## 5. Decisão sugerida para o estado atual

Para publicar o projeto com o menor esforço e sem introduzir uma camada
desnecessária:

```text
Vercel (Next.js e imagens)
       |
       | /api no mesmo domínio
       v
Render (NestJS atuando como BFF)
       |
       v
Neon (PostgreSQL)
```

Antes da publicação, os itens prioritários são:

1. remover a senha fixa do seed;
2. configurar `/api` no mesmo domínio por proxy;
3. substituir `prisma migrate dev` por `prisma migrate deploy` na produção;
4. persistir relatos de questões no PostgreSQL;
5. configurar HTTPS, cookies, CSRF e rate limiting;
6. excluir os PDFs-fonte do artefato de execução;
7. preparar backup do banco e validar uma restauração.

Nenhuma dessas discussões implicou alteração funcional no código durante a
análise; este arquivo serve como registro e orientação para uma futura etapa de
implantação.
