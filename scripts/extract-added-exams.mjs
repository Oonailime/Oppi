import fs from "node:fs";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const root = process.cwd();
const dataDirectory = path.join(root, "apps/api/prisma/data");
const publicQuestionsDirectory = path.join(
  root,
  "apps/web/public/questions",
);
const standardFontDataUrl = path.join(
  root,
  "node_modules/pdfjs-dist/standard_fonts/",
);
const scale = 2;
const auditOnly = process.argv.includes("--audit-only");

const exams = [
  {
    id: "ebserh-2024",
    answerKey: "provas/ebserh2024/gabarito-definitivo.pdf",
    answerReader: "ebserh",
    questionCount: 60,
    segments: [
      {
        key: "objective",
        file: "provas/ebserh2024/analista-ti-tipo-1.pdf",
        min: 1,
        max: 60,
        pages: Array.from({ length: 14 }, (_, index) => index + 3),
        leftX: 42.6,
        rightX: 311.7,
        leftBounds: [37, 287],
        rightBounds: [307, 558],
        bottom: 54,
      },
    ],
  },
  {
    id: "serpro-2023",
    answerReader: "cebraspe",
    questionCount: 120,
    segments: [
      {
        key: "basic",
        file: "provas/serpro2023/conhecimentos-basicos-questoes-1-50.pdf",
        answerKey:
          "provas/serpro2023/gabarito-definitivo-conhecimentos-basicos.pdf",
        min: 1,
        max: 50,
        pages: [1, 2, 3, 4],
        leftX: 28.3,
        rightX: 303.4,
        leftBounds: [23, 291],
        rightBounds: [298, 572],
        bottom: 35,
        fullPageContext: true,
      },
      {
        key: "specific",
        file:
          "provas/serpro2023/conhecimentos-especificos-ti-questoes-51-120.pdf",
        answerKey:
          "provas/serpro2023/gabarito-definitivo-conhecimentos-especificos-ti.pdf",
        min: 51,
        max: 120,
        pages: [1, 2, 3, 4],
        leftX: 28.3,
        rightX: 303.4,
        leftBounds: [23, 291],
        rightBounds: [298, 572],
        bottom: 35,
        fullPageContext: true,
      },
    ],
  },
  {
    id: "bacen-2024",
    answerReader: "cebraspe",
    questionCount: 120,
    segments: [
      {
        key: "basic",
        file: "provas/bacen2024/conhecimentos-basicos-questoes-1-50.pdf",
        answerKey:
          "provas/bacen2024/gabarito-definitivo-conhecimentos-basicos.pdf",
        min: 1,
        max: 50,
        pages: [1, 2, 3, 4],
        leftX: 28.3,
        rightX: 303.4,
        leftBounds: [23, 291],
        rightBounds: [298, 572],
        bottom: 35,
        fullPageContext: true,
      },
      {
        key: "specific",
        file:
          "provas/bacen2024/conhecimentos-especificos-ti-questoes-51-120.pdf",
        answerKey:
          "provas/bacen2024/gabarito-definitivo-conhecimentos-especificos-ti.pdf",
        min: 51,
        max: 120,
        pages: [1, 2, 3, 4],
        leftX: 28.3,
        rightX: 303.4,
        leftBounds: [23, 291],
        rightBounds: [298, 572],
        bottom: 35,
        fullPageContext: true,
        noContextQuestions: new Set([87, 94, 95]),
        cropBottomByQuestion: new Map([[95, 650]]),
      },
    ],
  },
  {
    id: "bndes-2024",
    answerKey: "provas/bndes2024/gabarito-final-apos-recursos.pdf",
    answerReader: "bndes",
    questionCount: 70,
    pageByQuestion: new Map([
      ...rangeOnPage(1, 3, 2),
      ...rangeOnPage(4, 9, 3),
      ...rangeOnPage(10, 11, 4),
      ...rangeOnPage(12, 17, 5),
      ...rangeOnPage(18, 20, 6),
      ...rangeOnPage(21, 25, 8),
      ...rangeOnPage(26, 30, 9),
      ...rangeOnPage(31, 35, 11),
      ...rangeOnPage(36, 41, 12),
      ...rangeOnPage(42, 46, 13),
      ...rangeOnPage(47, 51, 14),
      ...rangeOnPage(52, 56, 15),
      ...rangeOnPage(57, 61, 16),
      ...rangeOnPage(62, 67, 17),
      ...rangeOnPage(68, 70, 18),
    ]),
    segments: [
      {
        key: "objective",
        file:
          "provas/bndes2024/analise-de-sistemas-suporte-prova-objetiva.pdf",
        min: 1,
        max: 70,
        pages: [2, 3, 4, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18],
        leftX: 28.3,
        rightX: 311.8,
        leftBounds: [23, 291],
        rightBounds: [306, 572],
        bottom: 54,
      },
    ],
    extraContexts: [
      { file: "context-portugues.png", page: 7, questions: range(21, 30) },
      { file: "context-ingles.png", page: 10, questions: range(31, 35) },
    ],
  },
];

const subjectRules = [
  [/lei (?:n[ºo]\s*)?13\.709|lgpd|proteção de dados/i, "Lei Geral de Proteção de Dados (LGPD)"],
  [/lei (?:n[ºo]\s*)?12\.550|empresa brasileira de serviços hospitalares/i, "Lei de criação da EBSERH"],
  [/conselho de (?:administração|saúde)/i, "Conselhos de administração e saúde"],
  [/bioética|direitos humanos/i, "Bioética e direitos humanos"],
  [/determinantes sociais|dahlgren|whitehead/i, "Determinantes sociais da saúde"],
  [/sistema único de saúde/i, "Sistema Único de Saúde (SUS)"],
  [/lei (?:n[ºo]\s*)?9\.784|processo administrativo/i, "Processo administrativo federal"],
  [/\blicitaç|\bcontrataç|lei (?:n[ºo]\s*)?14\.133/i, "Licitações e contratações públicas"],
  [/plano plurianual|\bPPA\b|lei orçamentária|\bLOA\b|orçamento/i, "Orçamento público"],
  [/concordância/i, "Concordância verbal e nominal"],
  [/regência|crase/i, "Regência e crase"],
  [/pontuação|vírgula/i, "Pontuação"],
  [/pronome|referência pronominal/i, "Pronomes e referenciação"],
  [/\borações?\b|período composto|\bsintaxe\b/i, "Sintaxe e orações"],
  [/coesão|coerência|conector/i, "Coesão e coerência textual"],
  [/\binterpreta\w*|\bcompreensão (?:textual|do texto)|main purpose/i, "Interpretação de texto"],
  [/probabilidade/i, "Probabilidade"],
  [/estatíst|desvio padrão|variância|distribuição normal/i, "Estatística descritiva e inferencial"],
  [/\braciocínio lógico|\bproposiç(?:ão|ões)|tabela-verdade|lógica proposicional/i, "Lógica proposicional"],
  [/microeconom|macroeconom|inflação|produto interno|PIB/i, "Fundamentos de economia"],
  [/direito administrativo|ato administrativo|servidor público/i, "Direito administrativo"],
  [/ISO(?:\/IEC)?\s*2700|gestão de riscos|risco de segurança/i, "ISO 27001 e gestão de riscos"],
  [/criptograf|cifra|chave pública|certificado digital/i, "Criptografia e certificados digitais"],
  [/firewall|iptables|filtragem de pacotes/i, "Firewalls e filtragem de tráfego"],
  [/malware|trojan|botnet|zumbi|vírus|ransomware/i, "Malwares e ameaças"],
  [/phishing|engenharia social|spoofing/i, "Engenharia social e fraudes"],
  [/vulnerabil|exploit|\bXSS\b|OWASP|injeção/i, "Vulnerabilidades em aplicações"],
  [/controle de acesso|autentica|autorização|identidade/i, "Controle de acesso e autenticação"],
  [/spam|correio eletrônico|e-mail/i, "Segurança de correio eletrônico"],
  [/\bDNS\b|domain name/i, "Sistema de Nomes de Domínio (DNS)"],
  [/\bHTTP\b|HTTP\/[12]|websocket|gRPC/i, "Protocolos de aplicações web"],
  [/\bTCP\b|\bUDP\b|TCP\/IP/i, "Protocolos TCP/IP"],
  [/\bOSI\b|camada de (?:rede|transporte|enlace|aplicação)/i, "Modelo OSI"],
  [/roteamento|roteador|switch|VLAN|sub-rede|endereçamento IP/i, "Redes e roteamento"],
  [/\bSNMP\b|monitoramento de rede/i, "Gerenciamento de redes"],
  [/wireless|sem fio|wi-fi|802\.11/i, "Redes sem fio"],
  [/\bSQL\b|\bSELECT\b|\bJOIN\b|consulta aos? dados/i, "Consultas SQL"],
  [/índice|indexação|clusterizado/i, "Índices de banco de dados"],
  [/forma normal|normalização|dependência funcional/i, "Normalização de dados"],
  [/modelo (?:entidade|relacional)|diagrama.*dados|chave estrangeira/i, "Modelagem de dados"],
  [/NoSQL|MongoDB|orientado a documento/i, "Bancos de dados NoSQL"],
  [/data warehouse|data lake|\bETL\b/i, "Data warehouse e integração de dados"],
  [/big data|quatro Vs|volume.*variedade/i, "Fundamentos de Big Data"],
  [/machine learning|aprendizado de máquina|deep learning|rede neural/i, "Aprendizado de máquina"],
  [/inteligência artificial|\bIA\b|modelo de linguagem|\bLLM\b/i, "Inteligência artificial"],
  [/mineração de dados|CRISP-DM/i, "Mineração de dados e CRISP-DM"],
  [/qualidade de dados|governança de dados/i, "Qualidade e governança de dados"],
  [/CMMI|maturidade de processo/i, "CMMI"],
  [/Scrum|sprint|product backlog/i, "Scrum"],
  [/Kanban|cartões|post-its/i, "Kanban"],
  [/DevOps|DevSecOps|integração contínua|entrega contínua/i, "DevOps e DevSecOps"],
  [/teste de software|\bTDD\b|caso de teste/i, "Testes de software"],
  [/requisito|caso de uso|\bUML\b/i, "Engenharia de requisitos e UML"],
  [/padrão de projeto|design pattern|MVC/i, "Padrões de projeto"],
  [/microsserviço|arquitetura de software|arquitetura de sistemas/i, "Arquitetura de software"],
  [/\bREST\b|RESTful|GraphQL|\bAPI\b/i, "APIs REST e GraphQL"],
  [/método ágil|metodologia ágil/i, "Métodos ágeis"],
  [/\bITIL\b|gerência de problemas|gerenciamento de incidentes/i, "ITIL e gestão de serviços"],
  [/\bCOBIT\b|governança de TI/i, "Governança de TI"],
  [/\bPMBOK\b|gerenciamento de projetos|gestão de projetos/i, "Gestão de projetos"],
  [/sistema operacional|deadlock|processo e thread/i, "Sistemas operacionais"],
  [/\bLinux\b|chmod|kernel|sistema de arquivos/i, "Administração Linux"],
  [/\bWindows\b|Active Directory|PowerShell/i, "Administração Windows"],
  [/Docker|container|Swarm/i, "Contêineres e Docker"],
  [/\bKubernetes\b|\bpods?\b/i, "Orquestração com Kubernetes"],
  [/virtualiza|máquina virtual|hipervisor/i, "Virtualização"],
  [/\bIaaS\b|\bPaaS\b|\bSaaS\b|computação em nuvem|serviço em nuvem/i, "Computação em nuvem"],
  [/alta disponibilidade|tolerância a falhas|continuidade/i, "Alta disponibilidade e continuidade"],
  [/backup|recuperação de desastre|disaster recovery/i, "Backup e recuperação"],
  [/armazenamento|storage|\bRAID\b/i, "Armazenamento de dados"],
  [/AIOps|operações de TI assistidas/i, "AIOps"],
  [/Apache Kafka|\bKafka\b|mensageria|publish.*subscribe/i, "Mensageria e Apache Kafka"],
  [/linguagem de programação|\bJava\b|\bPython\b|algoritmo/i, "Programação e algoritmos"],
  [/estrutura de dados|árvore|pilha|fila/i, "Estruturas de dados"],
  [/interoperabilidade|padrões de informação em saúde/i, "Interoperabilidade em saúde"],
];

function createOverrides(rows) {
  return new Map(
    rows.map(([number, discipline, subject]) => [
      number,
      { discipline, subject },
    ]),
  );
}

const classificationOverrides = {
  "ebserh-2024": createOverrides([
    [42, "Segurança da Informação", "ISO 27001 e tratamento de riscos"],
    [43, "Gestão e Governança de TI", "Dimensões do ITIL 4"],
    [44, "Gestão e Governança de TI", "Governança de TI em empresas estatais"],
    [45, "Engenharia de Software", "Elicitação de requisitos"],
    [46, "Engenharia de Software", "Prototipação evolucionária"],
    [47, "Engenharia de Software", "CMMI e maturidade de processos"],
    [48, "Gestão de Processos", "Modelagem de processos com BPMN 2.0"],
    [49, "Banco de Dados", "Data warehouse e mineração de dados"],
    [50, "Banco de Dados", "Forma normal de Boyce-Codd"],
    [51, "Ciência de Dados", "Fundamentos de Big Data e os quatro Vs"],
    [52, "Gestão e Governança de TI", "Balanced Scorecard (BSC)"],
    [53, "Infraestrutura e Sistemas", "Automação de configuração com Puppet"],
    [54, "Segurança da Informação", "Autenticação e autorização no Apache"],
    [55, "Redes de Computadores", "HTTP na pilha TCP/IP"],
    [56, "Segurança da Informação", "Bots, backdoors e trojans"],
    [57, "Banco de Dados", "Modelagem dimensional"],
    [58, "Sistemas de Informação em Saúde", "Prontuário Eletrônico do Paciente"],
    [59, "Sistemas de Informação em Saúde", "Conjunto Mínimo de Dados da Saúde"],
    [60, "Sistemas de Informação em Saúde", "Padrões de interoperabilidade em saúde"],
  ]),
  "serpro-2023": createOverrides([
    [51, "Segurança da Informação", "Integridade da informação"],
    [52, "Segurança da Informação", "Confidencialidade da informação"],
    [53, "Segurança da Informação", "MFA e acesso privilegiado"],
    [54, "Segurança da Informação", "Política de segurança na ISO 27001"],
    [55, "Segurança da Informação", "Comunicação da política de segurança"],
    [56, "Segurança da Informação", "OpenID Connect"],
    [57, "Segurança da Informação", "OpenID Connect e autorização delegada"],
    [58, "Segurança da Informação", "ID Token no OpenID Connect"],
    [59, "Segurança da Informação", "Componentes vulneráveis no OWASP Top 10"],
    [60, "Segurança da Informação", "Controle de acesso quebrado"],
    [61, "Engenharia de Software", "Scrum e Extreme Programming"],
    [62, "Engenharia de Software", "Papéis do Scrum"],
    [63, "Engenharia de Software", "Testes unitários no Extreme Programming"],
    [64, "Gestão e Governança de TI", "Princípios orientadores do ITIL 4"],
    [65, "Gestão e Governança de TI", "ITIL 4 e práticas Lean"],
    [66, "Banco de Dados", "Consultas SQL com JOIN"],
    [67, "Banco de Dados", "Referências em bancos orientados a documentos"],
    [68, "Banco de Dados", "Modelagem lógica de dados"],
    [69, "Banco de Dados", "Particionamento de banco de dados"],
    [70, "Infraestrutura e Sistemas", "Administração do WildFly"],
    [71, "Infraestrutura e Sistemas", "Nginx e configuração de firewall"],
    [72, "Programação e Algoritmos", "Programação em Python"],
    [73, "Engenharia de Software", "Integração entre React e AngularJS"],
    [74, "Engenharia de Software", "Single-Page Applications"],
    [75, "Engenharia de Software", "System Usability Scale (SUS)"],
    [76, "Infraestrutura e Sistemas", "Camadas de aplicações Spring Boot em Docker"],
    [77, "Banco de Dados", "Bloqueio otimista e pessimista no Hibernate"],
    [78, "Engenharia de Software", "Desenvolvimento móvel com Flutter"],
    [79, "Banco de Dados", "Tipagem de dados no SQLite"],
    [80, "Banco de Dados", "Arquitetura sem servidor do SQLite"],
    [81, "Engenharia de Software", "Fluxo de commits no Git"],
    [82, "Engenharia de Software", "Branches no Git"],
    [83, "Redes de Computadores", "WebSockets sobre HTTP/2"],
    [84, "Infraestrutura e Sistemas", "Kubernetes e execução de contêineres"],
    [85, "Infraestrutura e Sistemas", "Streaming de eventos com Apache Kafka"],
    [86, "Engenharia de Software", "Épicos no product backlog"],
    [87, "Engenharia de Software", "Produto Mínimo Viável (MVP)"],
    [88, "Engenharia de Software", "Análise de pontos de função e story points"],
    [89, "Engenharia de Software", "Dívida técnica"],
    [90, "Engenharia de Software", "Revisão de código e programação em pares"],
    [91, "Engenharia de Software", "Mocks em testes unitários"],
    [92, "Engenharia de Software", "Migração de banco de dados em DevOps"],
    [93, "Infraestrutura e Sistemas", "Infraestrutura como código com Terraform"],
    [94, "Infraestrutura e Sistemas", "Resiliência com arquitetura ativo-ativo"],
    [95, "Engenharia de Software", "Desenvolvimento low-code e no-code"],
    [96, "Engenharia de Software", "Padrão de projeto Decorator"],
    [97, "Engenharia de Software", "Padrões de projeto GoF"],
    [98, "Engenharia de Software", "Padrão de projeto Observer"],
    [99, "Engenharia de Software", "Domain-Driven Design"],
    [100, "Engenharia de Software", "SAGA e CQRS em microsserviços"],
    [101, "Engenharia de Software", "Arquitetura distribuída com CORBA"],
    [102, "Engenharia de Software", "APIs RESTful"],
    [103, "Engenharia de Software", "SOAP e serviços web"],
    [104, "Engenharia de Software", "Princípio de segregação de interfaces"],
    [105, "Engenharia de Software", "Clean code"],
    [106, "Engenharia de Software", "Build, release e execução em aplicações 12-factor"],
    [107, "Engenharia de Software", "Codebase em aplicações 12-factor"],
    [108, "Infraestrutura e Sistemas", "Responsabilidades no modelo IaaS"],
    [109, "Infraestrutura e Sistemas", "Responsabilidades no modelo PaaS"],
    [110, "Infraestrutura e Sistemas", "Responsabilidades no modelo PaaS"],
    [111, "Ciência de Dados", "Matriz de confusão"],
    [112, "Ciência de Dados", "Regressão logística"],
    [113, "Ciência de Dados", "Regras de associação"],
    [114, "Ciência de Dados", "Atributos previsores e alvo"],
    [115, "Ciência de Dados", "Agrupamento de dados"],
    [116, "Infraestrutura e Sistemas", "Sistemas de arquivos distribuídos"],
    [117, "Ciência de Dados", "Processamento distribuído com MapReduce"],
    [118, "Ciência de Dados", "Fundamentos de Big Data"],
    [119, "Ciência de Dados", "Processamento paralelo"],
    [120, "Ciência de Dados", "Data lakes"],
  ]),
  "bacen-2024": createOverrides([
    [51, "Ciência de Dados", "Bag of Words"],
    [52, "Ciência de Dados", "Validação cruzada"],
    [53, "Ciência de Dados", "Deep learning"],
    [54, "Ciência de Dados", "Validação cruzada K-fold"],
    [55, "Ciência de Dados", "Hadoop Secondary NameNode"],
    [56, "Ciência de Dados", "Qualidade e consistência de dados"],
    [57, "Ciência de Dados", "Aprendizado não supervisionado e clustering"],
    [58, "Ciência de Dados", "Aprendizado por transferência"],
    [59, "Ciência de Dados", "Temperatura em grandes modelos de linguagem"],
    [60, "Ciência de Dados", "Threads em assistentes de inteligência artificial"],
    [61, "Ciência de Dados", "Redes neurais LSTM"],
    [62, "Ciência de Dados", "Ciclo de produção de modelos de aprendizado"],
    [63, "Ciência de Dados", "Versionamento em MLOps"],
    [64, "Ciência de Dados", "Governança e ética em inteligência artificial"],
    [65, "Segurança da Informação", "SAML e OAuth 2.0"],
    [66, "Segurança da Informação", "SAML e Single Sign-On"],
    [67, "Segurança da Informação", "Fuzzing em aplicações web"],
    [68, "Segurança da Informação", "Cross-Site Scripting"],
    [69, "Segurança da Informação", "Autenticação multifator adaptativa"],
    [70, "Segurança da Informação", "Autenticação multifator"],
    [71, "Segurança da Informação", "NIST Cybersecurity Framework 2.0"],
    [72, "Redes de Computadores", "WebSockets"],
    [73, "Infraestrutura e Sistemas", "Balanceamento de carga ativo-standby"],
    [74, "Redes de Computadores", "HTTP/1 e HTTP/2"],
    [75, "Redes de Computadores", "gRPC sobre HTTP/2"],
    [76, "Engenharia de Software", "DAST no DevSecOps"],
    [77, "Engenharia de Software", "DevOps e DevSecOps"],
    [78, "Segurança da Informação", "Rate limiting e HTTP 429"],
    [79, "Segurança da Informação", "Desenvolvimento seguro de aplicações"],
    [80, "Engenharia de Software", "Behavior-Driven Development"],
    [81, "Engenharia de Software", "Test-Driven Development"],
    [82, "Infraestrutura e Sistemas", "Pods e nós no Kubernetes"],
    [83, "Infraestrutura e Sistemas", "Kubernetes serverless"],
    [84, "Infraestrutura e Sistemas", "Computação serverless"],
    [85, "Infraestrutura e Sistemas", "Backend as a Service"],
    [86, "Infraestrutura e Sistemas", "Function as a Service"],
    [87, "Programação e Algoritmos", "Programação assíncrona em Python"],
    [88, "Engenharia de Software", "UX design e UI design"],
    [89, "Engenharia de Software", "GraphQL e bancos relacionais"],
    [90, "Engenharia de Software", "Arquitetura RESTful"],
    [91, "Engenharia de Software", "Padrões Abstract Factory e Facade"],
    [92, "Engenharia de Software", "Padrões Composite e Memento"],
    [93, "Segurança da Informação", "Distributed Ledger Technology e blockchain"],
    [94, "Programação e Algoritmos", "Recursividade em Java"],
    [95, "Programação e Algoritmos", "Coleções em Python"],
    [96, "Infraestrutura e Sistemas", "Recursos Kubernetes em YAML"],
    [97, "Infraestrutura e Sistemas", "Infraestrutura como código"],
    [98, "Infraestrutura e Sistemas", "Kube-scheduler"],
    [99, "Infraestrutura e Sistemas", "Runtimes de contêiner no Kubernetes"],
    [100, "Infraestrutura e Sistemas", "Dashboards com Grafana"],
    [101, "Infraestrutura e Sistemas", "Métricas do Prometheus"],
    [102, "Infraestrutura e Sistemas", "Application Performance Monitoring"],
    [103, "Redes de Computadores", "HTTP na camada de aplicação"],
    [104, "Segurança da Informação", "LDAP e Active Directory"],
    [105, "Infraestrutura e Sistemas", "Migração ao vivo de máquinas virtuais"],
    [106, "Infraestrutura e Sistemas", "Infraestrutura como serviço"],
    [107, "Infraestrutura e Sistemas", "Alta disponibilidade"],
    [108, "Infraestrutura e Sistemas", "Failover e failback"],
    [109, "Redes de Computadores", "Software-Defined Networking"],
    [110, "Infraestrutura e Sistemas", "Windows Admin Center"],
    [111, "Redes de Computadores", "Redes LAN e WAN"],
    [112, "Infraestrutura e Sistemas", "Gerenciamento de pacotes no Linux"],
    [113, "Banco de Dados", "Sharding em bancos NoSQL"],
    [114, "Banco de Dados", "Subqueries em SQL"],
    [115, "Banco de Dados", "Terceira forma normal"],
    [116, "Banco de Dados", "Desempenho em data warehouses"],
    [117, "Gestão e Governança de TI", "Sprint planning no Scrum"],
    [118, "Gestão e Governança de TI", "Kanban e Scrum"],
    [119, "Gestão e Governança de TI", "Planejamento da governança de dados"],
    [120, "Gestão e Governança de TI", "Gerenciamento de riscos no ITIL 4"],
  ]),
  "bndes-2024": createOverrides([
    [36, "Infraestrutura e Sistemas", "Deadlocks em sistemas operacionais"],
    [37, "Engenharia de Software", "Kanban"],
    [38, "Engenharia de Software", "Sprint backlog no Scrum"],
    [39, "Gestão e Governança de TI", "Fases da contratação de serviços de TIC"],
    [40, "Gestão e Governança de TI", "Gerenciamento de nível de serviço no ITIL"],
    [41, "Infraestrutura e Sistemas", "Storage Area Network"],
    [42, "Gestão e Governança de TI", "Gerenciamento de problemas no ITIL"],
    [43, "Infraestrutura e Sistemas", "Topologias Fibre Channel"],
    [44, "Infraestrutura e Sistemas", "Camadas da arquitetura Fibre Channel"],
    [45, "Infraestrutura e Sistemas", "Monitoramento de redes com Zabbix"],
    [46, "Infraestrutura e Sistemas", "Fases de AIOps"],
    [47, "Infraestrutura e Sistemas", "Correlação de eventos em AIOps"],
    [48, "Infraestrutura e Sistemas", "Streaming e ETL com Apache Kafka"],
    [49, "Infraestrutura e Sistemas", "Automação com Red Hat Ansible"],
    [50, "Infraestrutura e Sistemas", "Infraestrutura para inteligência artificial"],
    [51, "Infraestrutura e Sistemas", "Controle de acesso no Apache HTTP"],
    [52, "Infraestrutura e Sistemas", "Instalação do Docker Swarm"],
    [53, "Programação e Algoritmos", "Funções em shell script Bash"],
    [54, "Infraestrutura e Sistemas", "Computação serverless"],
    [55, "Infraestrutura e Sistemas", "Infraestrutura como código declarativa"],
    [56, "Infraestrutura e Sistemas", "Contêineres Docker"],
    [57, "Segurança da Informação", "Filtragem antispam com SpamAssassin"],
    [58, "Segurança da Informação", "Vírus polimórficos"],
    [59, "Redes de Computadores", "Endereço de loopback IPv6"],
    [60, "Segurança da Informação", "Firewall proxy"],
    [61, "Redes de Computadores", "Roteamento estático IPv4"],
    [62, "Redes de Computadores", "Camada de transporte do modelo OSI"],
    [63, "Segurança da Informação", "Controle de acesso IEEE 802.1X"],
    [64, "Infraestrutura e Sistemas", "Software como serviço"],
    [65, "Infraestrutura e Sistemas", "Hipervisor bare-metal"],
    [66, "Banco de Dados", "Bancos de dados orientados a grafos"],
    [67, "Banco de Dados", "Metadados e qualidade em data lakes"],
    [68, "Banco de Dados", "Consultas SQL com chave composta"],
    [69, "Ciência de Dados", "Enriquecimento de dados em processos ETL"],
    [70, "Banco de Dados", "Persistência em bancos NoSQL"],
  ]),
};

const languageSubjects = new Set([
  "Concordância verbal e nominal",
  "Regência e crase",
  "Pontuação",
  "Pronomes e referenciação",
  "Sintaxe e orações",
  "Coesão e coerência textual",
  "Interpretação de texto",
]);

const quantitativeSubjects = new Set([
  "Probabilidade",
  "Estatística descritiva e inferencial",
  "Lógica proposicional",
]);

const publicSubjects = new Set([
  "Lei Geral de Proteção de Dados (LGPD)",
  "Lei de criação da EBSERH",
  "Conselhos de administração e saúde",
  "Bioética e direitos humanos",
  "Determinantes sociais da saúde",
  "Sistema Único de Saúde (SUS)",
  "Processo administrativo federal",
  "Licitações e contratações públicas",
  "Orçamento público",
  "Fundamentos de economia",
  "Direito administrativo",
]);

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function rangeOnPage(start, end, page) {
  return range(start, end).map((number) => [number, page]);
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function loadPdf(relativePath) {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(path.join(root, relativePath))),
    standardFontDataUrl,
  });
  return { loadingTask, document: await loadingTask.promise };
}

async function textFromPage(document, pageNumber) {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  return normalizeText(
    content.items
      .filter((item) => "str" in item)
      .map((item) => item.str)
      .join(" "),
  );
}

function answersAfterNumberSequence(text, start, count, answerPattern) {
  const sequence = range(start, start + count - 1).join(" ");
  const index = text.indexOf(sequence);
  if (index === -1) {
    throw new Error(`Sequência ${start}-${start + count - 1} não localizada.`);
  }
  return text
    .slice(index + sequence.length)
    .split(/\s+/)
    .filter((token) => answerPattern.test(token))
    .slice(0, count);
}

async function readEbserhAnswers(exam) {
  const { loadingTask, document } = await loadPdf(exam.answerKey);
  const pageText = await textFromPage(document, 12);
  const heading = "Grupo - Analista de Tecnologia da Informação - TIPO 1";
  const nextHeading = "Grupo - Analista de Tecnologia da Informação - TIPO 2";
  const start = pageText.indexOf(heading);
  const end = pageText.indexOf(nextHeading);
  if (start === -1 || end === -1) {
    throw new Error("Gabarito EBSERH tipo 1 não localizado.");
  }
  const section = pageText.slice(start, end);
  const answers = [
    ...answersAfterNumberSequence(section, 1, 20, /^(?:[A-E]|\*)$/),
    ...answersAfterNumberSequence(section, 21, 20, /^(?:[A-E]|\*)$/),
    ...answersAfterNumberSequence(section, 41, 20, /^(?:[A-E]|\*)$/),
  ];
  await loadingTask.destroy();
  return answers;
}

async function readCebraspeAnswers(exam) {
  const answers = [];
  for (const segment of exam.segments) {
    const { loadingTask, document } = await loadPdf(segment.answerKey);
    const pageText = await textFromPage(document, 1);
    for (
      let start = segment.min;
      start <= segment.max;
      start += 20
    ) {
      const count = Math.min(20, segment.max - start + 1);
      answers.push(
        ...answersAfterNumberSequence(
          pageText,
          start,
          count,
          /^(?:C|E|X)$/,
        ),
      );
    }
    await loadingTask.destroy();
  }
  return answers;
}

async function readBndesAnswers(exam) {
  const { loadingTask, document } = await loadPdf(exam.answerKey);
  const basicText = await textFromPage(document, 1);
  const specificText = await textFromPage(document, 2);
  const answers = new Map();

  for (const match of basicText.matchAll(/(\d{1,2})\s*-\s*([A-E])/g)) {
    const number = Number(match[1]);
    if (number >= 1 && number <= 35) answers.set(number, match[2]);
  }

  const specificByNumber = new Map();
  for (const match of specificText.matchAll(
    /(\d{2})\s*-\s*(Anulada|[A-E])/g,
  )) {
    const number = Number(match[1]);
    const values = specificByNumber.get(number) ?? [];
    values.push(match[2]);
    specificByNumber.set(number, values);
  }
  for (let number = 36; number <= 70; number += 1) {
    const values = specificByNumber.get(number);
    if (!values || values.length < 4) {
      throw new Error(`Gabarito BNDES incompleto na questão ${number}.`);
    }
    answers.set(number, values[3]);
  }

  await loadingTask.destroy();
  return range(1, 70).map((number) => answers.get(number));
}

async function readAnswers(exam) {
  const readers = {
    ebserh: readEbserhAnswers,
    cebraspe: readCebraspeAnswers,
    bndes: readBndesAnswers,
  };
  const answers = await readers[exam.answerReader](exam);
  if (answers.length !== exam.questionCount || answers.some((item) => !item)) {
    throw new Error(
      `${exam.id}: esperadas ${exam.questionCount} respostas, obtidas ${answers.length}.`,
    );
  }
  return answers;
}

function markerSide(x, segment) {
  if (Math.abs(x - segment.leftX) < 3) return "left";
  if (Math.abs(x - segment.rightX) < 3) return "right";
  return null;
}

function markerNumber(exam, segment, pageNumber, item) {
  const raw = item.str.trim();
  if (!/^\d{1,3}$/.test(raw)) return null;
  const side = markerSide(item.transform[4], segment);
  if (!side) return null;

  let number = Number(raw);
  if (
    exam.id === "bndes-2024" &&
    pageNumber === 14 &&
    side === "left" &&
    item.transform[5] > 740 &&
    number === 4
  ) {
    number = 47;
  }
  if (number < segment.min || number > segment.max) return null;
  if (
    exam.pageByQuestion &&
    exam.pageByQuestion.get(number) !== pageNumber
  ) {
    return null;
  }
  return { number, side };
}

async function locateQuestions(exam, segment, document) {
  const markers = [];
  const pageContents = new Map();

  for (const pageNumber of segment.pages) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pageContents.set(pageNumber, content);
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const marker = markerNumber(exam, segment, pageNumber, item);
      if (!marker) continue;
      markers.push({
        ...marker,
        pageNumber,
        x: item.transform[4],
        y: item.transform[5],
      });
    }
  }

  const unique = new Map(markers.map((marker) => [marker.number, marker]));
  const expected = segment.max - segment.min + 1;
  if (unique.size !== expected) {
    const missing = range(segment.min, segment.max).filter(
      (number) => !unique.has(number),
    );
    throw new Error(
      `${exam.id}/${segment.key}: localizadas ${unique.size}/${expected}; ausentes: ${missing.join(", ")}.`,
    );
  }

  return {
    markers: [...unique.values()].sort((a, b) => a.number - b.number),
    pageContents,
  };
}

function questionText(marker, markers, content, segment) {
  const next = markers
    .filter(
      (candidate) =>
        candidate.pageNumber === marker.pageNumber &&
        candidate.side === marker.side &&
        candidate.y < marker.y,
    )
    .sort((a, b) => b.y - a.y)[0];
  const [x1, x2] =
    marker.side === "left" ? segment.leftBounds : segment.rightBounds;
  const yBottom = next?.y ?? segment.bottom;
  const items = content.items
    .filter(
      (item) =>
        "str" in item &&
        item.transform[4] >= x1 - 2 &&
        item.transform[4] <= x2 + 2 &&
        item.transform[5] <= marker.y + 3 &&
        item.transform[5] > yBottom + 2,
    )
    .sort((a, b) => {
      const lineDifference = b.transform[5] - a.transform[5];
      return Math.abs(lineDifference) > 2
        ? lineDifference
        : a.transform[4] - b.transform[4];
    })
    .map((item) => item.str)
    .join(" ");
  return normalizeText(items);
}

function cropCanvas(source, { x1, x2, yTop, yBottom }) {
  const sx = Math.round(x1 * scale);
  const sy = Math.round(source.height - yTop * scale);
  const width = Math.max(1, Math.round((x2 - x1) * scale));
  const height = Math.max(1, Math.round((yTop - yBottom) * scale));
  const output = createCanvas(width, height);
  const context = output.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, sx, sy, width, height, 0, 0, width, height);
  return output;
}

async function renderPage(document, pageNumber) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, viewport.width, viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

async function renderQuestions(exam, segment, document, markers, imageDirectory) {
  const byPage = Map.groupBy(markers, (marker) => marker.pageNumber);

  for (const [pageNumber, pageMarkers] of byPage) {
    const source = await renderPage(document, pageNumber);
    if (segment.fullPageContext) {
      const context = cropCanvas(source, {
        x1: 23,
        x2: 572,
        yTop: 790,
        yBottom: 35,
      });
      fs.writeFileSync(
        path.join(
          imageDirectory,
          `context-${segment.key}-p-${String(pageNumber).padStart(2, "0")}.png`,
        ),
        context.toBuffer("image/png"),
      );
    }

    for (const marker of pageMarkers) {
      const next = pageMarkers
        .filter(
          (candidate) =>
            candidate.side === marker.side && candidate.y < marker.y,
        )
        .sort((a, b) => b.y - a.y)[0];
      const [x1, x2] =
        marker.side === "left" ? segment.leftBounds : segment.rightBounds;
      const cropped = cropCanvas(source, {
        x1,
        x2,
        yTop: Math.min(marker.y + 14, 790),
        yBottom:
          segment.cropBottomByQuestion?.get(marker.number) ??
          (next ? next.y + 14 : segment.bottom),
      });
      fs.writeFileSync(
        path.join(
          imageDirectory,
          `q-${String(marker.number).padStart(3, "0")}.png`,
        ),
        cropped.toBuffer("image/png"),
      );
    }
  }
}

async function renderExtraContexts(exam, document, imageDirectory) {
  const contextByQuestion = new Map();
  for (const definition of exam.extraContexts ?? []) {
    const source = await renderPage(document, definition.page);
    const cropped = cropCanvas(source, {
      x1: 23,
      x2: 572,
      yTop: 790,
      yBottom: 35,
    });
    fs.writeFileSync(
      path.join(imageDirectory, definition.file),
      cropped.toBuffer("image/png"),
    );
    for (const question of definition.questions) {
      contextByQuestion.set(
        question,
        `/questions/${exam.id}/${definition.file}`,
      );
    }
  }
  return contextByQuestion;
}

function technicalDiscipline(text) {
  const rules = [
    ["Segurança da Informação", /seguran|criptograf|firewall|malware|ataque|vulnerab|autentica|phishing|spam|\bXSS\b|OWASP|certificado/i],
    ["Banco de Dados", /banco de dados|\bSGBD\b|\bSQL\b|\bSELECT\b|\bJOIN\b|tabela|índice|normaliza|NoSQL|Mongo|data warehouse|big data/i],
    ["Ciência de Dados", /machine learning|deep learning|aprendizado de máquina|inteligência artificial|rede neural|mineração de dados|CRISP-DM|qualidade de dados/i],
    ["Redes de Computadores", /\brede\b|\bTCP\b|\bUDP\b|\bHTTP\b|\bDNS\b|\bOSI\b|rotea|switch|SNMP|websocket|gRPC/i],
    ["Engenharia de Software", /software|CMMI|Scrum|Kanban|DevOps|requisito|teste|arquitetura|\bREST\b|GraphQL|\bAPI\b|\bUML\b|microsserv/i],
    ["Gestão e Governança de TI", /\bITIL\b|\bCOBIT\b|governança|gestão de TI|gerenciamento de (?:serviços|projetos)|PMBOK/i],
    ["Infraestrutura e Sistemas", /sistema operacional|Linux|Windows|Docker|Kubernetes|nuvem|\bIaaS\b|\bPaaS\b|virtualiza|servidor|storage|backup|alta disponibilidade|Kafka|AIOps/i],
    ["Programação e Algoritmos", /programação|linguagem|\bJava\b|\bPython\b|algoritmo|estrutura de dados/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ??
    "Tecnologia da Informação";
}

function disciplineFor(examId, number, text) {
  const override = classificationOverrides[examId]?.get(number);
  if (override) return override.discipline;

  if (examId === "ebserh-2024") {
    if (number <= 10) return "Língua Portuguesa";
    if (number <= 15) return "Legislação EBSERH";
    if (number <= 30) return "Políticas Públicas de Saúde";
    if (number <= 41) return "Administração Pública";
    return technicalDiscipline(text);
  }
  if (examId === "serpro-2023") {
    if (number <= 18) return "Língua Portuguesa";
    if (number <= 30) return "Língua Inglesa";
    if (number <= 35) return "Estatística e Probabilidade";
    if (number <= 45) return "Raciocínio Lógico";
    if (number <= 50) return "Proteção de Dados Pessoais";
    return technicalDiscipline(text);
  }
  if (examId === "bacen-2024") {
    if (number <= 25) return "Língua Portuguesa";
    if (number <= 35) return "Lógica e Estatística";
    if (number <= 40) return "Direito Administrativo";
    if (number <= 50) return "Economia";
    if (number <= 64) return "Ciência de Dados";
    if (number <= 71) return "Segurança da Informação";
    if (number <= 95) return "Engenharia de Software";
    if (number <= 112) return "Infraestrutura em TI";
    return "Banco de Dados";
  }
  if (number <= 20) return "Conhecimentos Transversais";
  if (number <= 30) return "Língua Portuguesa";
  if (number <= 35) return "Língua Inglesa";
  return technicalDiscipline(text);
}

function subjectFor(text, discipline) {
  const candidates = subjectRules.filter(([pattern]) => pattern.test(text));
  if (discipline === "Língua Portuguesa" || discipline === "Língua Inglesa") {
    return candidates.find(([, subject]) => languageSubjects.has(subject))?.[1] ??
      `Fundamentos de ${discipline}`;
  }
  if (
    discipline.includes("Lógico") ||
    discipline.includes("Lógica") ||
    discipline.includes("Estatística")
  ) {
    return candidates.find(([, subject]) => quantitativeSubjects.has(subject))?.[1] ??
      `Fundamentos de ${discipline}`;
  }
  if (
    discipline === "Administração Pública" ||
    discipline === "Políticas Públicas de Saúde" ||
    discipline === "Legislação EBSERH" ||
    discipline === "Conhecimentos Transversais" ||
    discipline === "Direito Administrativo" ||
    discipline === "Economia"
  ) {
    return candidates.find(([, subject]) => publicSubjects.has(subject))?.[1] ??
      `Fundamentos de ${discipline}`;
  }
  return candidates[0]?.[1] ?? `Fundamentos de ${discipline}`;
}

async function extractExam(exam) {
  const answers = await readAnswers(exam);
  const imageDirectory = path.join(publicQuestionsDirectory, exam.id);
  fs.mkdirSync(imageDirectory, { recursive: true });
  const extracted = new Map();
  const classificationAudit = [];
  let extraContextByQuestion = new Map();

  for (const segment of exam.segments) {
    const { loadingTask, document } = await loadPdf(segment.file);
    const { markers, pageContents } = await locateQuestions(
      exam,
      segment,
      document,
    );
    if (!auditOnly) {
      await renderQuestions(exam, segment, document, markers, imageDirectory);
    }
    if (exam.extraContexts && !auditOnly) {
      extraContextByQuestion = await renderExtraContexts(
        exam,
        document,
        imageDirectory,
      );
    }

    for (const marker of markers) {
      const text = questionText(
        marker,
        markers,
        pageContents.get(marker.pageNumber),
        segment,
      );
      const override = classificationOverrides[exam.id]?.get(marker.number);
      const discipline =
        override?.discipline ??
        disciplineFor(exam.id, marker.number, text);
      const subject =
        override?.subject ??
        subjectFor(text, discipline);
      classificationAudit.push({
        number: marker.number,
        discipline,
        subject,
        text,
      });
      extracted.set(marker.number, {
        id: marker.number,
        discipline,
        subject,
        weight: 1,
        sourcePage: marker.pageNumber,
        sourceImage: `/questions/${exam.id}/q-${String(marker.number).padStart(3, "0")}.png`,
        contextImage:
          segment.fullPageContext &&
          !segment.noContextQuestions?.has(marker.number)
          ? `/questions/${exam.id}/context-${segment.key}-p-${String(marker.pageNumber).padStart(2, "0")}.png`
          : null,
        correctAnswer: null,
        annulled: false,
        studyTopicId: null,
      });
    }
    await loadingTask.destroy();
  }

  for (const [number, contextImage] of extraContextByQuestion) {
    extracted.get(number).contextImage = contextImage;
  }

  const questions = range(1, exam.questionCount).map((number) => {
    const question = extracted.get(number);
    if (!question) throw new Error(`${exam.id}: questão ${number} ausente.`);
    const answer = answers[number - 1];
    const annulled = answer === "X" || answer === "*" || answer === "Anulada";
    return {
      ...question,
      correctAnswer: annulled ? null : answer,
      annulled,
    };
  });
  if (!auditOnly) {
    fs.writeFileSync(
      path.join(dataDirectory, `${exam.id}-questions.json`),
      `${JSON.stringify(questions, null, 2)}\n`,
    );
  }
  if (process.env.EXTRACTION_AUDIT === "1" || auditOnly) {
    fs.writeFileSync(
      path.join("/tmp", `${exam.id}-classification-audit.json`),
      `${JSON.stringify(
        classificationAudit.sort((a, b) => a.number - b.number),
        null,
        2,
      )}\n`,
    );
  }

  const counts = Map.groupBy(questions, (question) => question.discipline);
  console.log(
    `${exam.id}: ${questions.length} questões (${[...counts].map(([name, items]) => `${name}: ${items.length}`).join("; ")}).`,
  );
}

fs.mkdirSync(dataDirectory, { recursive: true });
fs.mkdirSync(publicQuestionsDirectory, { recursive: true });
for (const exam of exams) {
  await extractExam(exam);
}
console.log("Novas provas processadas: 370 questões.");
