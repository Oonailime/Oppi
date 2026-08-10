import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = path.join(root, "apps/api/prisma/data");
const reportFile = path.join(
  root,
  "automacoes/relatorio-categorizacao-dataprev.json",
);
const applyChanges = process.argv.includes("--apply");
const force = process.argv.includes("--force");
const dataprevContestId = "dataprev-2026-emiliano";

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(value, pattern) {
  return pattern.test(normalize(value));
}

function topicRule(id, pattern, confidence = "HIGH") {
  return { id, pattern, confidence };
}

// Regras prioritárias evitam colisões com termos genéricos. Por exemplo,
// "System Usability Scale (SUS)" não pode ser interpretado como saúde/SUS.
const prioritySubjectRules = [
  topicRule(139, /system usability|ux design|ui design|usabilidade/),
  topicRule(156, /padroes de interoperabilidade|interoperabilidade de sistemas/),
  topicRule(85, /nat e enderecamento ipv4 privado/),
  topicRule(65, /meios de transmissao sem fio/),
  topicRule(220, /controle de acesso quebrado/),
  topicRule(218, /controle de acesso|rate limiting|ldap|openid|oauth|saml|autenticacao|mfa/),
  topicRule(292, /application performance monitoring|observabilidade|\baiops\b/),
  topicRule(165, /desenvolvimento seguro de aplicacoes|devsecops|dast/),
  topicRule(175, /gerenciamento de capacidade em nuvem/),
  topicRule(188, /seguranca.*nuvem|informacao classificada.*nuvem|contratacao de servicos em nuvem/),
  topicRule(232, /armazenamento ssd|memoria flash/),
  topicRule(256, /monitoramento com zabbix e nagios/),
  topicRule(282, /escalonamento de pods no kubernetes/),
  topicRule(55, /temperatura.*modelo.*linguagem|grandes modelos de linguagem/),
  topicRule(56, /etica em inteligencia artificial/),
  topicRule(299, /validacao cruzada|k fold|redes neurais lstm|\bmlops\b|atributos previsores/),
  topicRule(250, /processamento paralelo/),
  topicRule(381, /single page applications|desenvolvimento movel com flutter/),
  topicRule(152, /domain driven design/),
  topicRule(81, /software defined networking/),
  topicRule(30, /logica proposicional/),
  topicRule(36, /estatistica|probabilidade/, "MEDIUM"),
  topicRule(42, /siafi|tesouro direto/),
  topicRule(
    47,
    /\bitil\b|iso iec 20000|gestao de servicos de ti|governanca de ti|balanced scorecard|\bbsc\b|recursos de ti \(sisp\)|\bsisp\b|contratacao de (servicos de )?tic|estudo tecnico preliminar|fiscalizacao de contratos de tic|recursos de tic|acessibilidade digital emag/,
    "MEDIUM",
  ),
];

// As demais regras usam o rótulo semântico produzido na extração da prova.
// O texto integral complementa categorias que chegam com rótulo genérico.
const subjectRules = [
  // Língua Portuguesa
  topicRule(13, /concordancia verbal|concordancia nominal/),
  topicRule(15, /regencia e crase|crase/),
  topicRule(14, /regencia verbal|regencia nominal/),
  topicRule(12, /pontuacao|virgula/),
  topicRule(5, /pronomes e referenciacao|referencia pronominal/),
  topicRule(4, /coesao e coerencia|coesao textual/),
  topicRule(11, /sintaxe e oracoes|oracoes subordinadas/),
  topicRule(2, /genero textual|tipos e generos|interpretacao de texto/),

  // Legislação, atualidades e temas transversais
  topicRule(64, /lei geral de protecao de dados|protecao de dados pessoais|lgpd/),
  topicRule(59, /lei de acesso a informacao/),
  topicRule(63, /marco civil/),
  topicRule(42, /economia|politica fiscal|credito|financiamento|orcamento publico|bndes/),
  topicRule(45, /saude|sistema unico de saude|ebserh|bioetica|prontuario/),
  topicRule(44, /educacao/),
  topicRule(50, /desenvolvimento sustentavel|sustentabilidade/),
  topicRule(43, /desigualdade|politica publica|administracao publica|direito administrativo/),

  // Redes
  topicRule(91, /\bdns\b|sistema de nomes de dominio/),
  topicRule(92, /\bsmtp\b/),
  topicRule(89, /\bftp\b/),
  topicRule(90, /\bssh\b/),
  topicRule(95, /\bhttp\b|http\/1|http\/2|websocket|grpc/),
  topicRule(97, /ssl|tls/),
  topicRule(77, /modelo osi|camada de transporte|camadas de rede/),
  topicRule(70, /sem fio|wireless|wlan|modulacao/),
  topicRule(78, /802\.1x/),
  topicRule(83, /ipv6/),
  topicRule(82, /ipv4/),
  topicRule(85, /enderecamento ip|loopback/),
  topicRule(86, /roteamento|multicast/),
  topicRule(73, /pontes transparentes|switch/),
  topicRule(67, /topologia/),
  topicRule(68, /\batm\b|rede wan/),
  topicRule(69, /rede lan|lan e wan/),
  topicRule(65, /meios de transmissao/),
  topicRule(81, /\barp\b|tcp\/ip|protocolo tcp|protocolo udp/),
  topicRule(349, /\bsnmp\b|monitoramento de redes/),

  // Banco de dados e analytics
  topicRule(112, /postgresql|pg_dump|tablespace/),
  topicRule(114, /microsoft sql server/),
  topicRule(110, /oracle database|oracle 19c|otimizador de consultas oracle/),
  topicRule(113, /mongodb|banco nosql|bancos nosql|orientado a documentos|orientados a grafos|sharding/),
  topicRule(109, /\bsql\b|subquer|group by|chave composta|join|valores nulos|linhas sequenciais/),
  topicRule(106, /forma normal|normalizacao/),
  topicRule(105, /modelagem logica|modelagem dimensional|modelagem de dados/),
  topicRule(104, /arvores b|estrutura de dados/),
  topicRule(117, /backup.*banco/),
  topicRule(124, /desempenho.*data warehouse|otimizacao|performance/),
  topicRule(302, /2 phase|banco.*distribuid|processamento distribuido|mapreduce/),
  topicRule(303, /mineracao de dados|crisp dm|regras de associacao/),
  topicRule(295, /\betl\b|enriquecimento de dados/),
  topicRule(298, /big data|quatro vs|data lake|hadoop/),
  topicRule(299, /machine learning|aprendizado|deep learning|rede neural|regressao logistica|matriz de confusao|clustering|agrupamento/),
  topicRule(300, /inteligencia artificial|assistente.*inteligencia|bag of words/),
  topicRule(313, /qualidade.*dados|governanca de dados|master data|metadados/),
  topicRule(121, /engenharia de dados|data warehouse/),
  topicRule(103, /sqlite|arquitetura.*banco/),
  topicRule(101, /banco de dados/),

  // Engenharia e arquitetura de software
  topicRule(150, /behavior driven|\bbdd\b/),
  topicRule(149, /test driven|\btdd\b/),
  topicRule(151, /padrao de projeto|design pattern|abstract factory|facade|composite|memento|decorator|observer|gof/),
  topicRule(147, /solid|segregacao de interfaces/),
  topicRule(134, /elicitacao de requisitos/),
  topicRule(133, /engenharia de requisitos|requisitos/),
  topicRule(138, /prototipacao/),
  topicRule(139, /ux design|ui design|usabilidade|system usability/),
  topicRule(128, /cmmi|qualidade de software|clean code|divida tecnica|revisao de codigo|testes unitarios|mocks/),
  topicRule(127, /scrum|kanban|metodo agil|extreme programming|product backlog|sprint|story points|mvp/),
  topicRule(130, /branches no git|commits no git|controle de versao/),
  topicRule(132, /integracao continua|build release/),
  topicRule(165, /devsecops|dast/),
  topicRule(162, /restful|arquitetura rest|\brest\b/),
  topicRule(157, /graphql|\bapis?\b/),
  topicRule(159, /web services|\bsoap\b|\bwsdl\b/),
  topicRule(156, /interoperabilidade/),
  topicRule(384, /arquitetura distribuida|\bcorba\b/),
  topicRule(388, /microsservico|\bsaga\b|\bcqrs\b/),
  topicRule(386, /publish subscribe|mensageria|streaming.*kafka/),
  topicRule(125, /ciclo de vida|12 factor|codebase/),
  topicRule(126, /metodologia.*desenvolvimento|low code|no code|bpmn/),

  // Linguagens, aplicações e servidores
  topicRule(207, /react/),
  topicRule(212, /spring boot/),
  topicRule(394, /\bspring\b/),
  topicRule(202, /gitlab/),
  topicRule(214, /apache kafka|confluent kafka/),
  topicRule(392, /jboss|wildfly/),
  topicRule(408, /nginx/),
  topicRule(407, /apache http/),
  topicRule(205, /recursividade em java|linguagem java/),
  topicRule(288, /programacao.*python|colecoes em python|python assincron/),
  topicRule(287, /shell script|\bbash\b/),
  topicRule(373, /java ee/),

  // Nuvem, automação, plataforma e sistemas operacionais
  topicRule(270, /\bansible\b/),
  topicRule(269, /\bpuppet\b/),
  topicRule(194, /kubernetes|kube scheduler|\bpods?\b|runtimes? de conteiner/),
  topicRule(192, /\bdocker\b|docker swarm|conteineres/),
  topicRule(167, /\biaas\b|infraestrutura como servico/),
  topicRule(168, /\bpaas\b/),
  topicRule(169, /\bsaas\b|software como servico/),
  topicRule(166, /serverless|function as a service|backend as a service|computacao em nuvem/),
  topicRule(189, /infraestrutura como codigo|\biac\b|terraform/),
  topicRule(174, /alta disponibilidade|ativo ativo|ativo standby|failover|failback/),
  topicRule(178, /recuperacao de desastre/),
  topicRule(360, /virtualizacao|hipervisor|migracao ao vivo/),
  topicRule(238, /storage area|fibre channel|storage fisico/),
  topicRule(240, /sistemas de arquivos distribuidos/),
  topicRule(253, /sistema de arquivos ntfs/),
  topicRule(329, /deadlock|concorrencia de processos/),
  topicRule(343, /linux|chmod|cgroups/),
  topicRule(350, /gerenciamento de pacotes/),
  topicRule(339, /windows admin|active directory/),
  topicRule(294, /prometheus|metricas/),
  topicRule(292, /observabilidade|application performance|\baiops\b|grafana|zabbix|nagios/),
  topicRule(218, /firewall|iptables|controle de acesso.*apache|ldap|openid|oauth|saml|autenticacao|mfa|rate limiting/),
  topicRule(229, /nist cybersecurity/),
  topicRule(224, /certificacao|icp brasil/),
  topicRule(222, /criptograf|cifra|blockchain|distributed ledger/),
  topicRule(223, /malware|virus|bots|backdoor|trojan|spamassassin/),
  topicRule(220, /vulnerab|owasp|cross site|\bxss\b|fuzzing|hardening/),
  topicRule(221, /ataque|ddos|spoofing/),
  topicRule(215, /politica de seguranca|iso.*27001|controles da iso/),
  topicRule(217, /gestao de riscos|risco de seguranca|aceitacao de riscos|gestor de seguranca|integridade da informacao|confidencialidade|incidente/),
  topicRule(236, /backup completo/),
  topicRule(234, /backup.*conceito/),
  topicRule(235, /recovery point|\brpo\b/),
];

const disciplineFallbacks = [
  [/lingua portuguesa/, 1],
  [/lingua inglesa/, 22],
  [/raciocinio logico|logica|estatistica|probabilidade/, 36],
  [/protecao de dados/, 64],
  [/seguranca da informacao/, 217],
  [/redes de computadores/, 81],
  [/banco de dados/, 101],
  [/ciencia de dados/, 297],
  [/engenharia de software/, 125],
  [/gestao de processos|gestao e governanca|gestao de servicos/, 126],
  [/infraestrutura|sistemas de computacao/, 249],
  [/programacao e algoritmos/, 205],
  [/economia/, 42],
  [/saude|ebserh/, 45],
  [/administracao publica|direito administrativo|conhecimentos transversais/, 43],
];

// Questões cujo rótulo da fonte é deliberadamente amplo. Manter essas
// exceções por prova torna a decisão reproduzível e simples de revisar.
const questionOverrides = new Map(
  Object.entries({
    "ebserh-2024": {
      1: 1,
      2: 18,
      3: 17,
      4: 2,
      5: 2,
      6: 2,
      7: 2,
      8: 7,
      9: 18,
    },
    "serpro-2023": {
      1: 1,
      2: 1,
      5: 17,
      8: 18,
      9: 12,
      10: 19,
      12: 1,
      13: 1,
      14: 1,
      15: 1,
      17: 5,
      19: 22,
      20: 22,
      21: 22,
      22: 23,
      23: 22,
      24: 22,
      25: 22,
      26: 22,
      27: 22,
      28: 22,
      29: 22,
      30: 23,
      31: 36,
      32: 36,
      33: 36,
      34: 36,
      35: 36,
      36: 33,
      37: 33,
      38: 32,
      39: 33,
      40: 25,
      41: 33,
      42: 33,
      43: 25,
      44: 37,
      45: 36,
    },
    "bacen-2024": {
      1: 1,
      2: 1,
      3: 12,
      4: 1,
      5: 18,
      6: 6,
      8: 9,
      9: 11,
      11: 13,
      13: 16,
      14: 1,
      15: 1,
      16: 1,
      17: 1,
      23: 19,
      25: 1,
      26: 36,
      27: 36,
      28: 36,
      29: 36,
      30: 36,
      31: 36,
      32: 36,
      33: 36,
      34: 36,
      35: 36,
    },
    "bndes-2024": {
      1: 50,
      2: 50,
      3: 51,
      4: 50,
      5: 50,
      6: 42,
      7: 43,
      8: 42,
      9: 42,
      10: 42,
      11: 36,
      12: 42,
      13: 42,
      14: 42,
      15: 36,
      16: 36,
      17: 43,
      18: 43,
      19: 303,
      20: 43,
      21: 1,
      22: 1,
      23: 7,
      24: 1,
      27: 1,
      28: 1,
      29: 12,
      30: 5,
      31: 22,
      32: 23,
      33: 22,
      34: 23,
      35: 23,
    },
  }).map(([examId, overrides]) => [
    examId,
    new Map(
      Object.entries(overrides).map(([questionNumber, topicId]) => [
        Number(questionNumber),
        topicId,
      ]),
    ),
  ]),
);

function loadAuditText(examId) {
  const auditFile = path.join("/tmp", `${examId}-classification-audit.json`);
  if (!fs.existsSync(auditFile)) return new Map();
  const rows = JSON.parse(fs.readFileSync(auditFile, "utf8"));
  return new Map(rows.map((row) => [row.number, row.text]));
}

function languageTopic(question, fullText) {
  const discipline = normalize(question.discipline);
  const subject = normalize(question.subject);
  const text = normalize(fullText);
  if (discipline === "lingua inglesa") {
    return /\bsuffix\b|\bpronoun\b|\brefers to\b|\bverb\b|\bgrammar\b|\bword .* formed\b/.test(text)
      ? { id: 23, confidence: "MEDIUM", method: "language-text" }
      : { id: 22, confidence: "HIGH", method: "language-text" };
  }
  if (discipline !== "lingua portuguesa" || !subject.includes("fundamentos")) {
    return null;
  }
  const rules = [
    [7, /tempo verbal|modo verbal|verbo/],
    [5, /referente|pronome|referenciacao/],
    [18, /significado|sentido da palavra|palavra depreciativa|sinonim/],
    [2, /texto argumentativo|texto injuntivo|genero textual|tipologia/],
    [12, /pontuacao|virgula|dois pontos/],
    [9, /classe de palavra|adjetivo|adverbio|conjuncao|preposicao/],
    [17, /reescrita|correcao gramatical|linguagem culta/],
  ];
  const match = rules.find(([, pattern]) => pattern.test(text));
  return match
    ? { id: match[0], confidence: "MEDIUM", method: "language-text" }
    : { id: 1, confidence: "MEDIUM", method: "language-fallback" };
}

function classify(examId, question, fullText, topicsById) {
  const questionNumber = question.number ?? question.id;
  const overriddenTopicId = questionOverrides.get(examId)?.get(questionNumber);
  if (overriddenTopicId) {
    return {
      id: overriddenTopicId,
      confidence: "REVIEWED",
      method: "question-override",
    };
  }

  const language = languageTopic(question, fullText);
  if (language) return language;

  const rules = [...prioritySubjectRules, ...subjectRules];
  const subjectRule = rules.find((candidate) =>
    matches(question.subject, candidate.pattern),
  );
  const source = `${question.discipline} ${question.subject}`;
  const rule =
    subjectRule ?? rules.find((candidate) => matches(source, candidate.pattern));
  if (rule) {
    return { id: rule.id, confidence: rule.confidence, method: "subject-rule" };
  }

  const normalizedDiscipline = normalize(question.discipline);
  const fallback = disciplineFallbacks.find(([pattern]) =>
    pattern.test(normalizedDiscipline),
  );
  if (!fallback) return null;
  if (!topicsById.has(fallback[1])) return null;
  return { id: fallback[1], confidence: "LOW", method: "discipline-fallback" };
}

const topics = JSON.parse(
  fs.readFileSync(path.join(dataDirectory, "study-topics.json"), "utf8"),
);
const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
const exams = JSON.parse(
  fs.readFileSync(path.join(dataDirectory, "exams.json"), "utf8"),
).filter(
  (exam) =>
    exam.id !== "dataprev-2024" &&
    !exam.id.startsWith("enem-") &&
    (exam.contestId === undefined || exam.contestId === dataprevContestId),
);

const report = [];
for (const exam of exams) {
  const questionFile = path.join(dataDirectory, exam.questionsFile);
  const questions = JSON.parse(fs.readFileSync(questionFile, "utf8"));
  const auditText = loadAuditText(exam.id);
  let changed = false;

  for (const question of questions) {
    const existingTopic = topicsById.get(question.studyTopicId);
    const classification =
      existingTopic && !force
        ? {
            id: existingTopic.id,
            confidence: "EXISTING",
            method: "existing",
          }
        : classify(
            exam.id,
            question,
            auditText.get(question.number ?? question.id),
            topicsById,
          );
    if (!classification) {
      report.push({
        examId: exam.id,
        questionNumber: question.number ?? question.id,
        discipline: question.discipline,
        subject: question.subject,
        status: "UNRESOLVED",
      });
      continue;
    }

    const topic = topicsById.get(classification.id);
    if (!topic) {
      throw new Error(`Tópico ${classification.id} não existe.`);
    }
    if (question.studyTopicId !== classification.id) {
      question.studyTopicId = classification.id;
      changed = true;
    }
    report.push({
      examId: exam.id,
      questionNumber: question.number ?? question.id,
      sourceDiscipline: question.discipline,
      sourceSubject: question.subject,
      studyTopicId: topic.id,
      targetDiscipline: topic.discipline,
      targetSubject: topic.subject,
      confidence: classification.confidence,
      method: classification.method,
    });
  }

  if (applyChanges && changed) {
    fs.writeFileSync(questionFile, `${JSON.stringify(questions, null, 2)}\n`);
  }
}

const unresolved = report.filter((row) => row.status === "UNRESOLVED");
function confidenceCounts(rows) {
  return Object.fromEntries(
    ["EXISTING", "REVIEWED", "HIGH", "MEDIUM", "LOW", "UNRESOLVED"].map(
      (level) => [
        level,
        rows.filter(
          (row) => row.confidence === level || row.status === level,
        ).length,
      ],
    ),
  );
}

const byExam = Object.fromEntries(
  exams.map((exam) => {
    const rows = report.filter((row) => row.examId === exam.id);
    return [
      exam.id,
      {
        total: rows.length,
        categorized: rows.length - rows.filter((row) => row.status).length,
        unresolved: rows.filter((row) => row.status === "UNRESOLVED").length,
        lowConfidence: rows.filter((row) => row.confidence === "LOW").length,
        confidence: confidenceCounts(rows),
      },
    ];
  }),
);
fs.writeFileSync(
  reportFile,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      applied: applyChanges,
      force,
      summary: {
        total: report.length,
        categorized: report.length - unresolved.length,
        unresolved: unresolved.length,
        confidence: confidenceCounts(report),
        byExam,
      },
      questions: report,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ applied: applyChanges, ...byExam }, null, 2));
if (unresolved.length > 0) process.exitCode = 1;
