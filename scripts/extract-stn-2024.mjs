import fs from "node:fs";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const root = process.cwd();
const examPath = path.join(
  root,
  "provas/area-de-tecnologia-da-informacao-operacao-e-infraestruturacns104-tipo-1.pdf",
);
const answerKeyPath = path.join(
  root,
  "provas/stn2024-gabaritos-para-publicacao-manha-e-tarde.pdf",
);
const dataPath = path.join(
  root,
  "apps/api/prisma/data/stn-2024-questions.json",
);
const imageDir = path.join(root, "apps/web/public/questions/stn-2024");
const standardFontDataUrl = path.join(
  root,
  "node_modules/pdfjs-dist/standard_fonts/",
);
const scale = 2.4;

const classification = [
  ["Segurança da Informação", "Integridade da informação", 217],
  ["Segurança da Informação", "Aceitação de riscos de segurança", 217],
  ["Segurança da Informação", "Gestão de riscos de segurança da informação", 217],
  ["Segurança da Informação", "Gestor de segurança da informação", 217],
  ["Segurança da Informação", "Política de Segurança da Informação (POSIC)", 215],
  ["Segurança da Informação", "Backup completo", 236],
  ["Segurança da Informação", "Recovery Point Objective (RPO)", 235],
  ["Segurança da Informação", "NAT e endereçamento IPv4 privado", 85],
  ["Segurança da Informação", "Tratamento e resposta a incidentes (ETIR)", 217],
  ["Segurança da Informação", "Armazenamento SSD e memória flash", 232],
  ["Segurança da Informação", "Spoofing", 221],
  ["Segurança da Informação", "Ataque distribuído de negação de serviço (DDoS)", 221],
  ["Segurança da Informação", "Sistema de Nomes de Domínio (DNS)", 91],
  ["Segurança da Informação", "Cifras de bloco e de fluxo", 222],
  ["Segurança da Informação", "Firewall iptables", 218],
  ["Segurança da Informação", "ICP-Brasil e Autoridade de Registro", 224],
  ["Segurança da Informação", "Hardening de sistemas", 220],
  ["Segurança da Informação", "Controles da ISO/IEC 27001:2022", 215],
  ["Segurança da Informação", "Protocolo SMTP e comando HELO", 92],
  ["Segurança da Informação", "Segurança e informação classificada em nuvem", 188],
  ["Gestão de Serviços de TI", "ISO/IEC 20000:2018", null],
  ["Gestão de Serviços de TI", "Quatro dimensões do ITIL 4", null],
  ["Gestão de Serviços de TI", "Princípios orientadores do ITIL 4", null],
  ["Gestão de Serviços de TI", "Sistema de Valor de Serviço do ITIL 4", null],
  ["Gestão de Serviços de TI", "Gerenciamento de incidentes no ITIL", null],
  ["Gestão de Serviços de TI", "Gerenciamento de capacidade em nuvem", null],
  ["Gestão de Serviços de TI", "SIAFI e Tesouro Direto", null],
  ["Gestão de Serviços de TI", "Padrões de interoperabilidade ePING", null],
  ["Gestão de Serviços de TI", "Acessibilidade digital eMAG", null],
  ["Gestão de Serviços de TI", "Sistema de Administração dos Recursos de TI (SISP)", null],
  ["Gestão de Serviços de TI", "Fases da contratação de TIC na IN SGD/ME 94/2022", null],
  ["Gestão de Serviços de TI", "Estudo Técnico Preliminar", null],
  ["Gestão de Serviços de TI", "Contratação de serviços em nuvem", 188],
  ["Gestão de Serviços de TI", "Papéis na fiscalização de contratos de TIC", null],
  ["Gestão de Serviços de TI", "Recursos de TIC na IN SGD/ME 94/2022", null],
  ["Banco de Dados", "Subconsultas correlacionadas em SQL", 109],
  ["Banco de Dados", "Funções de agregação e GROUP BY", 109],
  ["Banco de Dados", "Numeração sequencial de linhas em SQL", 109],
  ["Banco de Dados", "Remoção de registros duplicados em SQL", 109],
  ["Banco de Dados", "Forma normal de Boyce-Codd", 106],
  ["Banco de Dados", "Lógica de três estados e valores nulos", 109],
  ["Banco de Dados", "Técnicas de mineração de dados", 303],
  ["Banco de Dados", "Bancos de sistema do Microsoft SQL Server", 114],
  ["Banco de Dados", "Metadados de tabelas no Microsoft SQL Server", 114],
  ["Banco de Dados", "Otimizador de consultas Oracle", 110],
  ["Banco de Dados", "2-Phase Commit e 2-Phase Lock", 302],
  ["Banco de Dados", "Oracle Database Resource Manager", 110],
  ["Banco de Dados", "Backup PostgreSQL com pg_dump", 112],
  ["Banco de Dados", "Árvores B", 104],
  ["Banco de Dados", "Tablespaces no PostgreSQL", 112],
  ["Redes de Computadores", "Meios de transmissão sem fio", 65],
  ["Redes de Computadores", "Topologia full-mesh", 67],
  ["Redes de Computadores", "Camadas de rede e transporte no modelo OSI", 77],
  ["Redes de Computadores", "Protocolo ARP", 81],
  ["Redes de Computadores", "Pontes transparentes", 73],
  ["Redes de Computadores", "Roteamento multicast no Linux", 86],
  ["Redes de Computadores", "Operações TRAP do SNMP", null],
  ["Redes de Computadores", "Asynchronous Transfer Mode (ATM)", 68],
  ["Redes de Computadores", "Modulação em redes sem fio", 70],
  ["Redes de Computadores", "Automação de infraestrutura com Ansible", 270],
  ["Sistemas de Computação", "Sistema de arquivos NTFS", 253],
  ["Sistemas de Computação", "Concatenação de arquivos no Linux", 343],
  ["Sistemas de Computação", "Permissões de arquivos com chmod", 343],
  ["Sistemas de Computação", "Hipervisor tipo 1", 360],
  ["Sistemas de Computação", "Módulos do JBoss", 392],
  ["Sistemas de Computação", "Monitoramento com Zabbix e Nagios", 256],
  ["Sistemas de Computação", "Controle de recursos com cgroups", 343],
  ["Sistemas de Computação", "Escalonamento de Pods no Kubernetes", 282],
  ["Sistemas de Computação", "Descrição de Web Services com WSDL", 159],
  ["Sistemas de Computação", "Padrão Publish/Subscribe", 386],
];

const contexts = new Map(
  Array.from({ length: 4 }, (_, index) => [
    36 + index,
    "/questions/stn-2024/context-ipca.png",
  ]),
);

function pageForQuestion(number) {
  if (number <= 6) return 3;
  if (number <= 14) return 4;
  if (number <= 21) return 5;
  if (number <= 26) return 6;
  if (number <= 32) return 7;
  if (number <= 35) return 8;
  if (number <= 39) return 9;
  if (number <= 46) return 10;
  if (number <= 54) return 11;
  if (number <= 62) return 12;
  return 13;
}

async function loadPdf(filePath) {
  return pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(filePath)),
    standardFontDataUrl,
  }).promise;
}

async function readAnswers() {
  const document = await loadPdf(answerKeyPath);
  const page = await document.getPage(2);
  const content = await page.getTextContent();
  const text = content.items
    .filter((item) => "str" in item)
    .map((item) => item.str)
    .join(" ");
  const heading =
    "ÁREA DE TECNOLOGIA DA INFORMAÇÃO (OPERAÇÃO E INFRAESTRUTURA) - PROVA TIPO 1";
  const nextHeading =
    "ÁREA DE TECNOLOGIA DA INFORMAÇÃO (OPERAÇÃO E INFRAESTRUTURA) - PROVA TIPO 2";
  const start = text.indexOf(heading);
  const end = text.indexOf(nextHeading);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Não foi possível localizar o gabarito STN tipo 1.");
  }

  const answers = text
    .slice(start + heading.length, end)
    .match(/\b[A-E]\b/g);
  if (!answers || answers.length !== 70) {
    throw new Error(
      `O gabarito STN deveria ter 70 respostas, mas foram encontradas ${answers?.length ?? 0}.`,
    );
  }

  return answers;
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

async function writeExamImages() {
  const document = await loadPdf(examPath);
  const renderedPages = new Map();
  const positions = [];

  for (let pageNumber = 3; pageNumber <= 13; pageNumber += 1) {
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
      if (
        !("str" in item) ||
        !/^(?:[1-9]|[1-6][0-9]|70)$/.test(item.str.trim())
      ) {
        continue;
      }
      const x = item.transform[4];
      const y = item.transform[5];
      const number = Number(item.str.trim());
      if (
        pageForQuestion(number) === pageNumber &&
        (Math.abs(x - 42.6) < 2 || Math.abs(x - 311.7) < 2)
      ) {
        positions.push({
          number,
          pageNumber,
          side: x < 300 ? "left" : "right",
          y,
        });
      }
    }
  }

  const uniquePositions = new Map(
    positions.map((position) => [position.number, position]),
  );
  if (uniquePositions.size !== 70) {
    throw new Error(`Foram localizadas ${uniquePositions.size} de 70 questões.`);
  }

  for (let number = 1; number <= 70; number += 1) {
    const position = uniquePositions.get(number);
    const canvas = renderedPages.get(position.pageNumber);
    const candidates = [...uniquePositions.values()]
      .filter(
        (item) =>
          item.pageNumber === position.pageNumber &&
          item.side === position.side &&
          item.y < position.y,
      )
      .sort((a, b) => b.y - a.y);
    const nextQuestionY = candidates[0]?.y;
    let yBottom =
      nextQuestionY === undefined ? 54 : nextQuestionY + 14;

    if (number === 20) yBottom = 457;
    if (number === 35) yBottom = 544;
    if (number === 50) yBottom = 617;
    if (number === 60) yBottom = 421;

    const cropped = cropCanvas(canvas, {
      x1: position.side === "left" ? 37 : 307,
      x2: position.side === "left" ? 287 : 558,
      yTop: position.y + 14,
      yBottom,
    });
    fs.writeFileSync(
      path.join(imageDir, `q-${String(number).padStart(2, "0")}.png`),
      cropped.toBuffer("image/png"),
    );
  }

  const context = cropCanvas(renderedPages.get(8), {
    x1: 307,
    x2: 558,
    yTop: 544,
    yBottom: 54,
  });
  fs.writeFileSync(
    path.join(imageDir, "context-ipca.png"),
    context.toBuffer("image/png"),
  );
}

async function writeQuestions() {
  if (classification.length !== 70) {
    throw new Error("A classificação STN deve conter 70 itens.");
  }
  const answers = await readAnswers();
  const questions = classification.map(
    ([discipline, subject, studyTopicId], index) => {
      const number = index + 1;
      return {
        id: number,
        discipline,
        subject,
        weight: 1,
        sourcePage: pageForQuestion(number),
        sourceImage: `/questions/stn-2024/q-${String(number).padStart(2, "0")}.png`,
        contextImage: contexts.get(number) ?? null,
        correctAnswer: answers[index],
        annulled: false,
        studyTopicId,
      };
    },
  );

  fs.writeFileSync(dataPath, `${JSON.stringify(questions, null, 2)}\n`);
}

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.mkdirSync(imageDir, { recursive: true });
await writeQuestions();
await writeExamImages();
console.log("STN 2024 processada: 70 questões, gabarito e 1 texto-base.");
