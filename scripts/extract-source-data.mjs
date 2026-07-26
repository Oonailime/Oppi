import fs from "node:fs";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import XLSX from "xlsx";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const root = process.cwd();
const examPath = path.join(
  root,
  "provas/dataprev2024",
  "ati-arquitetura-engenharia-e-sustentacao-tecnologica-cns002-tipo-01.pdf",
);
const workbookPath = path.join(
  root,
  "Plano_Estudos_DATAPREV_2026_Perfil_2.xlsx",
);
const dataDir = path.join(root, "apps/api/prisma/data");
const imageDir = path.join(root, "apps/web/public/questions");
const scale = 2.4;

const answers = [
  "E", "D", "C", "C", "A", "D", "C", "D", "A", "D",
  "E", "A", null, "B", "E", "C", "D", "E", "D", "A",
  "B", "E", "B", "C", "C", "B", "B", "D", "C", "A",
  "B", "A", "D", "C", "E", "D", "A", "B", "E", "C",
  "D", null, "E", "C", "D", "A", "E", "C", "C", "B",
  "C", "D", "C", "C", "B", "C", "D", "A", "C", "B",
  "A", "D", "E", "A", "B", "A", "A", "E", "A", "A",
];

const classification = [
  ["Língua Portuguesa", "Orações subordinadas", 11],
  ["Língua Portuguesa", "Adjunto adnominal", 9],
  ["Língua Portuguesa", "Interpretação de texto literário", 1],
  ["Língua Portuguesa", "Relações de sentido: paradoxo", 18],
  ["Língua Portuguesa", "Regência verbal", 14],
  ["Língua Portuguesa", "Adjetivos e locuções adjetivas", 9],
  ["Língua Portuguesa", "Emprego da vírgula", 12],
  ["Língua Portuguesa", "Discurso direto", 2],
  ["Língua Portuguesa", "Relações semânticas e conectores", 6],
  ["Língua Portuguesa", "Verbos de estado", 9],
  ["Língua Portuguesa", "Concordância nominal", 13],
  ["Língua Portuguesa", "Variação linguística", 2],
  ["Língua Inglesa", "Compreensão global de texto", 22],
  ["Língua Inglesa", "Finalidade e informação textual", 22],
  ["Língua Inglesa", "Referência pronominal", 23],
  ["Língua Inglesa", "Conectores discursivos", 23],
  ["Língua Inglesa", "Conjunções e adição", 23],
  ["Língua Inglesa", "Inferência de informação", 22],
  ["Língua Inglesa", "Referência pronominal", 23],
  ["Língua Inglesa", "Vocabulário em contexto", 22],
  ["Língua Inglesa", "Gênero artigo acadêmico", 22],
  ["Língua Inglesa", "Vocabulário e classe gramatical", 23],
  ["Língua Inglesa", "Verbos modais", 23],
  ["Língua Inglesa", "Classe gramatical em contexto", 23],
  ["Raciocínio Lógico", "Divisão proporcional", 36],
  ["Raciocínio Lógico", "Média ponderada", 36],
  ["Raciocínio Lógico", "Sistemas algébricos", 36],
  ["Raciocínio Lógico", "Equivalência lógica", 33],
  ["Raciocínio Lógico", "Análise combinatória em grafos", 24],
  ["Raciocínio Lógico", "Porcentagem e taxa média", 36],
  ["Atualidades e Inteligência Artificial", "G20 e cooperação internacional", 49],
  ["Atualidades e Inteligência Artificial", "Sustentabilidade digital", 50],
  ["Atualidades e Inteligência Artificial", "Racismo ambiental", 51],
  ["Atualidades e Inteligência Artificial", "Privacidade de dados de saúde", 45],
  ["Atualidades e Inteligência Artificial", "Cidades-esponja e drenagem urbana", 50],
  ["Legislação de Segurança da Informação e Proteção de Dados", "Lei de Acesso à Informação", 59],
  ["Legislação de Segurança da Informação e Proteção de Dados", "Delitos informáticos", 62],
  ["Legislação de Segurança da Informação e Proteção de Dados", "Marco Civil da Internet", 63],
  ["Legislação de Segurança da Informação e Proteção de Dados", "Sanções administrativas da LGPD", 64],
  ["Legislação de Segurança da Informação e Proteção de Dados", "ANPD e Conselho Nacional", 64],
  ["Redes de Computadores", "Topologias de rede", 67],
  ["Redes de Computadores", "Protocolo FTP", 89],
  ["Redes de Computadores", "Padrão IEEE 802.11a", 80],
  ["Redes de Computadores", "VLAN e trunking", 75],
  ["Banco de Dados", "Monitoramento no PostgreSQL", 112],
  ["Banco de Dados", "Arquitetura de três esquemas", 102],
  ["Banco de Dados", "Normalização e restrições SQL", 106],
  ["Banco de Dados", "Consultas SQL e divisão relacional", 109],
  ["Banco de Dados", "Transações e consultas SQL", 109],
  ["Arquitetura Tecnológica", "Polimorfismo", 145],
  ["Arquitetura Tecnológica", "Princípio da inversão de dependência", 147],
  ["Arquitetura Tecnológica", "Gherkin e BDD", 150],
  ["Arquitetura Tecnológica", "Prototipação", 138],
  ["Computação em Nuvem e Virtualização", "Hipervisores e virtualização", 166],
  ["Computação em Nuvem e Virtualização", "IaC imperativa", 189],
  ["Computação em Nuvem e Virtualização", "VMware Cloud Director", 197],
  ["Computação em Nuvem e Virtualização", "Harbor Registry", 193],
  ["Segurança da Informação", "Dados pessoais sensíveis", 225],
  ["Segurança da Informação", "Criptografia simétrica", 222],
  ["Segurança da Informação", "Certificação digital", 224],
  ["Segurança da Informação", "Pseudonimização na LGPD", 225],
  ["Plataforma Básica", "Memória cache", 251],
  ["Plataforma Básica", "Armazenamento baseado em software", 240],
  ["Automação", "Orquestração com Kubernetes", 282],
  ["Automação", "Integração contínua no DevOps", 267],
  ["Computação em Nuvem e Virtualização", "Infraestrutura como serviço (IaaS)", 167],
  ["Ferramentas Analytics", "Detecção de outliers", 303],
  ["Ferramentas Analytics", "Redução de dimensionalidade", 299],
  ["Aplicações", "Java e uso de iteradores", 379],
  ["Aplicações", "Arquiteturas de aplicações", 381],
];

const contexts = new Map([
  ...Array.from({ length: 6 }, (_, index) => [13 + index, "/questions/context-career-guide.png"]),
  [19, "/questions/context-printer.png"],
  [20, "/questions/context-printer.png"],
  [21, "/questions/context-app-ecosystem.png"],
  [22, "/questions/context-app-ecosystem.png"],
  [23, "/questions/context-app-ecosystem.png"],
  [24, "/questions/context-app-ecosystem.png"],
  [47, "/questions/context-sql-schema.png"],
  [48, "/questions/context-sql-schema.png"],
  [49, "/questions/context-sql-schema.png"],
]);

function pageForQuestion(number) {
  if (number <= 8) return 3;
  if (number <= 12) return 4;
  if (number <= 20) return 5;
  if (number <= 27) return 6;
  if (number <= 32) return 7;
  if (number <= 36) return 8;
  if (number <= 40) return 9;
  if (number <= 46) return 10;
  if (number <= 51) return 11;
  if (number <= 57) return 12;
  if (number <= 64) return 13;
  return 14;
}

function writeTopics() {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets["Conteúdo do Edital"];
  if (!sheet) throw new Error("A aba Conteúdo do Edital não foi encontrada.");

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
  const topics = rows.map((row) => ({
    id: Number(row.ID),
    module: row.Módulo,
    discipline: row.Disciplina,
    syllabusItem: String(row["Item do edital"]),
    subject: row.Assunto,
    detail: row["Detalhamento / escopo"],
    page: String(row.Página),
    suggestedPriority: row["Prioridade sugerida"],
  }));

  fs.writeFileSync(
    path.join(dataDir, "study-topics.json"),
    `${JSON.stringify(topics, null, 2)}\n`,
  );
}

function writeQuestions() {
  if (classification.length !== 70 || answers.length !== 70) {
    throw new Error("A classificação e o gabarito devem conter 70 itens.");
  }

  const questions = classification.map(
    ([discipline, subject, studyTopicId], index) => {
      const id = index + 1;
      return {
        id,
        discipline,
        subject,
        weight: id <= 40 ? 1 : 2.5,
        sourcePage: pageForQuestion(id),
        sourceImage: `/questions/q-${String(id).padStart(2, "0")}.png`,
        contextImage: contexts.get(id) ?? null,
        correctAnswer: answers[index],
        annulled: answers[index] === null,
        studyTopicId,
      };
    },
  );

  fs.writeFileSync(
    path.join(dataDir, "questions.json"),
    `${JSON.stringify(questions, null, 2)}\n`,
  );
}

function cropCanvas(source, { x1, x2, yTop, yBottom }) {
  const sx = Math.round(x1 * scale);
  const sy = Math.round(source.height - yTop * scale);
  const width = Math.round((x2 - x1) * scale);
  const height = Math.round((yTop - yBottom) * scale);
  const output = createCanvas(width, height);
  output
    .getContext("2d")
    .drawImage(source, sx, sy, width, height, 0, 0, width, height);
  return output;
}

function stackCanvases(canvases) {
  const width = Math.max(...canvases.map((canvas) => canvas.width));
  const height = canvases.reduce((total, canvas) => total + canvas.height, 0);
  const output = createCanvas(width, height);
  const context = output.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  let offset = 0;
  for (const canvas of canvases) {
    context.drawImage(canvas, 0, offset);
    offset += canvas.height;
  }
  return output;
}

async function writeExamImages() {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(examPath)),
    standardFontDataUrl: path.join(
      root,
      "node_modules/pdfjs-dist/standard_fonts/",
    ),
  });
  const document = await loadingTask.promise;
  const renderedPages = new Map();
  const positions = [];

  for (let pageNumber = 3; pageNumber <= 14; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport,
    }).promise;
    renderedPages.set(pageNumber, canvas);

    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !/^(?:[1-9]|[1-6][0-9]|70)$/.test(item.str.trim())) {
        continue;
      }
      const x = item.transform[4];
      const y = item.transform[5];
      const id = Number(item.str.trim());
      if (
        pageForQuestion(id) === pageNumber &&
        (Math.abs(x - 42.6) < 2 || Math.abs(x - 311.7) < 2)
      ) {
        positions.push({
          id,
          pageNumber,
          side: x < 300 ? "left" : "right",
          y,
        });
      }
    }
  }

  const uniquePositions = new Map(positions.map((position) => [position.id, position]));
  if (uniquePositions.size !== 70) {
    throw new Error(`Foram localizadas ${uniquePositions.size} de 70 questões.`);
  }

  for (let id = 1; id <= 70; id += 1) {
    const position = uniquePositions.get(id);
    const canvas = renderedPages.get(position.pageNumber);
    const candidates = [...uniquePositions.values()]
      .filter(
        (item) =>
          item.pageNumber === position.pageNumber &&
          item.side === position.side &&
          item.y < position.y,
      )
      .sort((a, b) => b.y - a.y);
    const previousQuestionY = candidates[0]?.y;
    let yBottom = previousQuestionY === undefined ? 54 : previousQuestionY + 14;
    if (id === 12) yBottom = 248;
    if (id === 18) yBottom = 545;
    if (id === 46) yBottom = 398;

    const cropped = cropCanvas(canvas, {
      x1: position.side === "left" ? 37 : 307,
      x2: position.side === "left" ? 287 : 558,
      yTop: position.y + 14,
      yBottom,
    });
    fs.writeFileSync(
      path.join(imageDir, `q-${String(id).padStart(2, "0")}.png`),
      cropped.toBuffer("image/png"),
    );
  }

  const contextDefinitions = [
    {
      file: "context-career-guide.png",
      parts: [
        { page: 4, x1: 37, x2: 287, yTop: 253, yBottom: 54 },
        { page: 4, x1: 307, x2: 558, yTop: 792, yBottom: 54 },
      ],
    },
    {
      file: "context-printer.png",
      parts: [{ page: 5, x1: 307, x2: 558, yTop: 544, yBottom: 427 }],
    },
    {
      file: "context-app-ecosystem.png",
      parts: [{ page: 6, x1: 37, x2: 287, yTop: 792, yBottom: 536 }],
    },
    {
      file: "context-sql-schema.png",
      parts: [{ page: 10, x1: 307, x2: 558, yTop: 402, yBottom: 54 }],
    },
  ];

  for (const definition of contextDefinitions) {
    const parts = definition.parts.map((part) =>
      cropCanvas(renderedPages.get(part.page), part),
    );
    const output = stackCanvases(parts);
    fs.writeFileSync(
      path.join(imageDir, definition.file),
      output.toBuffer("image/png"),
    );
  }
}

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(imageDir, { recursive: true });
writeTopics();
writeQuestions();
await writeExamImages();
console.log("Fonte processada: 409 tópicos, 70 questões e 4 textos-base.");
