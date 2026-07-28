import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const topicIds = new Map([
  ["Língua Inglesa::Interpretação de texto em língua inglesa", 10001],
  ["Língua Espanhola::Interpretação de texto em língua espanhola", 10002],
  ["Língua Portuguesa::Interpretação e resolução de problemas", 10003],
  ["Literatura::Literatura", 10004],
  ["Artes::Artes", 10005],
  ["Educação Física::Educação Física", 10006],
  ["Tecnologias da Comunicação::Tecnologias da comunicação", 10007],
  ["Língua Portuguesa::Variação linguística", 10008],
  ["Língua Portuguesa::Gramática e recursos linguísticos", 10009],
  ["História::História", 10101],
  ["Geografia::Geografia", 10102],
  ["Filosofia::Filosofia", 10103],
  ["Sociologia::Sociologia", 10104],
  ["Ciências Humanas (Interdisciplinar)::Interpretação e resolução de problemas", 10105],
  ["Biologia::Biologia", 10201],
  ["Física::Física", 10202],
  ["Química::Química", 10203],
  ["Ciências da Natureza (Interdisciplinar)::Interpretação e resolução de problemas", 10204],
  ["Matemática::Geometria", 10301],
  ["Matemática::Estatística e probabilidade", 10302],
  ["Matemática::Funções", 10303],
  ["Matemática::Matemática financeira", 10304],
  ["Matemática::Álgebra", 10305],
  ["Matemática::Aritmética e proporcionalidade", 10306],
  ["Matemática::Interpretação e resolução de problemas", 10307],
]);

function normalizeDiscipline(question) {
  const area = question.discipline;
  const subject = question.subject;
  if (area === "Língua Inglesa" || area === "Língua Espanhola") return area;
  if (area === "Matemática e suas Tecnologias" || area === "Matemática") {
    return "Matemática";
  }
  if (
    area === "Ciências da Natureza e suas Tecnologias" ||
    area === "Ciências da Natureza (Interdisciplinar)" ||
    ["Biologia", "Física", "Química"].includes(area)
  ) {
    return subject === "Interpretação e resolução de problemas"
      ? "Ciências da Natureza (Interdisciplinar)"
      : subject;
  }
  if (
    area === "Ciências Humanas e suas Tecnologias" ||
    area === "Ciências Humanas (Interdisciplinar)" ||
    ["História", "Geografia", "Filosofia", "Sociologia"].includes(area)
  ) {
    return subject === "Interpretação e resolução de problemas"
      ? "Ciências Humanas (Interdisciplinar)"
      : subject;
  }
  const languageDisciplines = {
    Literatura: "Literatura",
    Artes: "Artes",
    "Educação Física": "Educação Física",
    "Tecnologias da comunicação": "Tecnologias da Comunicação",
  };
  return languageDisciplines[subject] ?? "Língua Portuguesa";
}

const totals = new Map();
const countsByYear = new Map();
for (let year = 2016; year <= 2025; year += 1) {
  const file = path.join(
    root,
    `apps/api/prisma/data/enem-${year}-questions.json`,
  );
  const questions = JSON.parse(fs.readFileSync(file, "utf8"));
  const yearCounts = new Map();
  for (const question of questions) {
    question.discipline = normalizeDiscipline(question);
    question.studyTopicId =
      topicIds.get(`${question.discipline}::${question.subject}`) ?? null;
    if (question.studyTopicId === null) {
      throw new Error(
        `${year}/${question.number}/${question.variant}: categoria sem tópico.`,
      );
    }
    totals.set(
      question.discipline,
      (totals.get(question.discipline) ?? 0) + 1,
    );
    yearCounts.set(
      question.discipline,
      (yearCounts.get(question.discipline) ?? 0) + 1,
    );
  }
  countsByYear.set(year, yearCounts);
  fs.writeFileSync(file, `${JSON.stringify(questions, null, 2)}\n`);
}

const reportFile = path.join(root, "enem/extraction-validation.json");
const reports = JSON.parse(fs.readFileSync(reportFile, "utf8"));
for (const report of reports) {
  const counts = countsByYear.get(report.year);
  if (!counts) continue;
  report.disciplineCounts = Object.fromEntries(
    [...counts].sort(([left], [right]) =>
      left.localeCompare(right, "pt-BR"),
    ),
  );
  report.categorizedQuestionCount = report.recordCount;
  report.studyTopicLinkedQuestionCount = report.recordCount;
}
fs.writeFileSync(reportFile, `${JSON.stringify(reports, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      records: [...totals.values()].reduce((sum, value) => sum + value, 0),
      disciplines: Object.fromEntries(
        [...totals].sort(([left], [right]) =>
          left.localeCompare(right, "pt-BR"),
        ),
      ),
    },
    null,
    2,
  ),
);
