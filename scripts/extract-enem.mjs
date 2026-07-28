import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  createCanvas,
  DOMMatrix,
  ImageData,
  Path2D,
} from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const root = process.cwd();
const years = process.argv
  .filter((argument) => /^--year=\d{4}$/.test(argument))
  .map((argument) => Number(argument.split("=")[1]));
const selectedYears =
  years.length > 0
    ? years
    : Array.from({ length: 10 }, (_, index) => 2016 + index);
const reuseImages = process.argv.includes("--reuse-images");
const scale = 1.6;
const standardFontDataUrl = path.join(
  root,
  "node_modules/pdfjs-dist/standard_fonts/",
);
const wasmUrl = path.join(root, "node_modules/pdfjs-dist/wasm/");
const outputDataDirectory = path.join(root, "apps/api/prisma/data");
const publicQuestionsDirectory = path.join(
  root,
  "apps/web/public/questions",
);

const layouts = [
  {
    from: 2016,
    to: 2016,
    leftBounds: [54, 313],
    rightBounds: [314, 575],
    top: 758,
    bottom: 54,
    markerMargin: 16,
  },
  {
    from: 2017,
    to: 2018,
    leftBounds: [51, 311],
    rightBounds: [312, 572],
    top: 740,
    bottom: 54,
    markerMargin: 16,
  },
  {
    from: 2019,
    to: 2021,
    leftBounds: [24, 283],
    rightBounds: [284, 550],
    top: 718,
    bottom: 54,
    markerMargin: 16,
  },
  {
    from: 2022,
    to: 2023,
    leftBounds: [24, 283],
    rightBounds: [284, 550],
    top: 726,
    bottom: 54,
    markerMargin: 16,
  },
  {
    from: 2024,
    to: 2024,
    leftBounds: [44, 321],
    rightBounds: [322, 590],
    fullBounds: [44, 590],
    dynamicColumns: true,
    top: 762,
    bottom: 54,
    markerMargin: 17,
  },
  {
    from: 2025,
    to: 2025,
    leftBounds: [44, 321],
    rightBounds: [322, 590],
    fullBounds: [44, 590],
    dynamicColumns: true,
    top: 758,
    bottom: 54,
    markerMargin: 18,
  },
];

function layoutFor(year) {
  const layout = layouts.find(
    (candidate) => year >= candidate.from && year <= candidate.to,
  );
  if (!layout) throw new Error(`Layout não configurado para ${year}.`);
  return layout;
}

function normalizeText(value) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function answerValue(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (/^ANULAD[AO]$/.test(normalized)) return null;
  return /^[A-E]$/.test(normalized) ? normalized : undefined;
}

function languageRange(year) {
  return year === 2016
    ? { day: 2, min: 91, max: 95 }
    : { day: 1, min: 1, max: 5 };
}

function dayRange(day) {
  return day === 1 ? { min: 1, max: 90 } : { min: 91, max: 180 };
}

function markerNumber(year, item) {
  const raw = item.str.trim();
  const regular =
    raw.match(/^QUEST[AÃ]O\s+(\d{1,3})$/i) ??
    raw.match(/^Questão\s+(\d{1,3})$/i);
  if (regular) return Number(regular[1]);
  if (
    year === 2025 &&
    /^\d{2,3}$/.test(raw) &&
    Math.abs(item.transform[0] - 11) < 0.2 &&
    item.transform[4] > 90 &&
    item.transform[4] < 400
  ) {
    return Number(raw);
  }
  return null;
}

async function openDocument(file) {
  const task = pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(file)),
    standardFontDataUrl,
    wasmUrl,
    useSystemFonts: true,
  });
  return { task, document: await task.promise };
}

async function readAnswerKey(year, day) {
  const file = path.join(
    root,
    `enem/${year}/gabarito_dia_${day}_caderno_azul.pdf`,
  );
  const { task, document } = await openDocument(file);
  const content = await (await document.getPage(1)).getTextContent();
  const lines = [];

  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    let line = lines.find(
      (candidate) => Math.abs(candidate.y - item.transform[5]) < 0.65,
    );
    if (!line) {
      line = { y: item.transform[5], items: [] };
      lines.push(line);
    }
    line.items.push({
      value: item.str.trim(),
      x: item.transform[4],
      width: item.width ?? 0,
    });
  }

  const range = dayRange(day);
  const answers = new Map();
  for (const line of lines) {
    const sorted = line.items.sort((left, right) => left.x - right.x);
    const merged = [];
    for (const item of sorted) {
      const previous = merged.at(-1);
      if (
        previous &&
        /^\d+$/.test(previous.value) &&
        /^\d+$/.test(item.value) &&
        item.x - (previous.x + previous.width) < 1.6
      ) {
        previous.value += item.value;
        previous.width = item.x + item.width - previous.x;
      } else {
        merged.push({ ...item });
      }
    }

    for (let index = 0; index < merged.length; index += 1) {
      const token = merged[index];
      if (!/^\d{1,3}$/.test(token.value)) continue;
      const number = Number(token.value);
      if (number < range.min || number > range.max) continue;
      const values = [];
      for (
        let answerIndex = index + 1;
        answerIndex < merged.length &&
        !/^\d{1,3}$/.test(merged[answerIndex].value);
        answerIndex += 1
      ) {
        const value = answerValue(merged[answerIndex].value);
        if (value !== undefined) values.push(value);
      }
      if (values.length > 0) answers.set(number, values);
    }
  }

  const pageText = normalizeText(
    content.items
      .filter((item) => "str" in item)
      .map((item) => item.str)
      .join(" "),
  );
  for (const match of pageText.matchAll(/Questão\s+(\d{1,3})\s+Anulada/gi)) {
    answers.set(Number(match[1]), [null]);
  }

  const language = languageRange(year);
  const errors = [];
  for (let number = range.min; number <= range.max; number += 1) {
    const values = answers.get(number) ?? [];
    const expected =
      day === language.day &&
      number >= language.min &&
      number <= language.max
        ? 2
        : 1;
    if (values.length !== expected) {
      errors.push(`${number}: ${values.length}/${expected}`);
    }
  }
  await task.destroy();
  if (errors.length > 0) {
    throw new Error(
      `${year}/dia ${day}: gabarito incompleto (${errors.join(", ")}).`,
    );
  }
  return answers;
}

function variantFor(marker, occurrence, year, day) {
  const language = languageRange(year);
  if (
    day !== language.day ||
    marker.number < language.min ||
    marker.number > language.max
  ) {
    return "";
  }
  return occurrence === 1 ? "ENGLISH" : "SPANISH";
}

function answerFor(answers, number, variant, year, day) {
  const values = answers.get(number);
  if (!values) return undefined;
  const language = languageRange(year);
  if (
    day === language.day &&
    number >= language.min &&
    number <= language.max
  ) {
    return variant === "SPANISH" ? values[1] : values[0];
  }
  return values[0];
}

function cropCanvas(sourcePage, { x1, x2, yTop, yBottom }) {
  const { canvas: source, viewport } = sourcePage;
  const boundedTop = Math.min(yTop, viewport.viewBox[3]);
  const boundedBottom = Math.max(yBottom, 0);
  const [viewportX1, viewportYTop] = viewport.convertToViewportPoint(
    x1,
    boundedTop,
  );
  const [viewportX2, viewportYBottom] = viewport.convertToViewportPoint(
    x2,
    boundedBottom,
  );
  const sx = Math.round(Math.min(viewportX1, viewportX2));
  const sy = Math.round(Math.min(viewportYTop, viewportYBottom));
  const width = Math.max(1, Math.round(Math.abs(viewportX2 - viewportX1)));
  const height = Math.max(
    1,
    Math.round(Math.abs(viewportYBottom - viewportYTop)),
  );
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
  const renderTask = page.render({ canvasContext: context, viewport });
  let timeout;
  try {
    await Promise.race([
      renderTask.promise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Renderização travada na página ${pageNumber}.`)),
          15_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  return { canvas, viewport };
}

function composePieces(pieces) {
  const padding = 10;
  const gap = 6;
  const width = Math.max(...pieces.map((piece) => piece.width)) + padding * 2;
  const height =
    pieces.reduce((total, piece) => total + piece.height, 0) +
    padding * 2 +
    Math.max(0, pieces.length - 1) * gap;
  const output = createCanvas(width, height);
  const context = output.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  let y = padding;
  for (const piece of pieces) {
    context.drawImage(piece, padding, y);
    y += piece.height + gap;
  }
  return output;
}

function trimCanvasVertically(source, padding = 5) {
  const context = source.getContext("2d");
  const pixels = context.getImageData(
    0,
    0,
    source.width,
    source.height,
  ).data;
  let firstRow = source.height;
  let lastRow = -1;
  for (let y = 0; y < source.height; y += 1) {
    let hasInk = false;
    for (let x = 0; x < source.width; x += 1) {
      const offset = (y * source.width + x) * 4;
      if (
        pixels[offset + 3] > 10 &&
        (pixels[offset] < 248 ||
          pixels[offset + 1] < 248 ||
          pixels[offset + 2] < 248)
      ) {
        hasInk = true;
        break;
      }
    }
    if (hasInk) {
      firstRow = Math.min(firstRow, y);
      lastRow = y;
    }
  }
  if (lastRow < firstRow) return null;
  const y1 = Math.max(0, firstRow - padding);
  const y2 = Math.min(source.height, lastRow + padding + 1);
  const output = createCanvas(source.width, y2 - y1);
  const outputContext = output.getContext("2d");
  outputContext.fillStyle = "#fff";
  outputContext.fillRect(0, 0, output.width, output.height);
  outputContext.drawImage(
    source,
    0,
    y1,
    source.width,
    y2 - y1,
    0,
    0,
    source.width,
    y2 - y1,
  );
  return output;
}

function textFromPieces(pieces, pageContents) {
  const result = [];
  for (const piece of pieces) {
    const content = pageContents.get(piece.pageNumber);
    if (!content) continue;
    const items = content.items
      .filter(
        (item) =>
          "str" in item &&
          item.transform[4] >= piece.x1 - 2 &&
          item.transform[4] <= piece.x2 + 2 &&
          item.transform[5] <= piece.yTop + 2 &&
          item.transform[5] >= piece.yBottom - 2,
      )
      .sort((left, right) => {
        const yDifference = right.transform[5] - left.transform[5];
        return Math.abs(yDifference) > 2
          ? yDifference
          : left.transform[4] - right.transform[4];
      })
      .map((item) => item.str);
    result.push(items.join(" "));
  }
  return normalizeText(result.join(" "));
}

function areaFor(year, day, number, variant) {
  if (variant === "ENGLISH") return "Língua Inglesa";
  if (variant === "SPANISH") return "Língua Espanhola";
  if (year === 2016) {
    if (day === 1 && number <= 45) {
      return "Ciências Humanas e suas Tecnologias";
    }
    if (day === 1) return "Ciências da Natureza e suas Tecnologias";
    if (number <= 135) return "Linguagens, Códigos e suas Tecnologias";
    return "Matemática e suas Tecnologias";
  }
  if (day === 1 && number <= 45) {
    return "Linguagens, Códigos e suas Tecnologias";
  }
  if (day === 1) return "Ciências Humanas e suas Tecnologias";
  if (number <= 135) return "Ciências da Natureza e suas Tecnologias";
  return "Matemática e suas Tecnologias";
}

function subjectFor(area, text) {
  if (area === "Língua Inglesa") {
    return "Interpretação de texto em língua inglesa";
  }
  if (area === "Língua Espanhola") {
    return "Interpretação de texto em língua espanhola";
  }

  if (area === "Ciências da Natureza e suas Tecnologias") {
    const indicators = {
      Biologia: [
        [3, /célula/i], [3, /gene|genét|DNA|RNA/i],
        [3, /ecossistema|ecolog/i], [3, /espécie|evolução/i],
        [3, /fisiolog|fotossíntese/i], [3, /bactér|vírus/i],
        [3, /enzima|proteína/i], [3, /hereditar|imun|hormô/i],
        [3, /tecido|metaboli/i], [1, /organismo|seres vivos/i],
        [1, /biodivers|animal|vegetal/i], [1, /saúde|doença|vacina/i],
      ],
      Química: [
        [3, /reação química|equação química/i], [3, /ácido|base|pH/i],
        [3, /íon|átomo|mol\b/i], [3, /solução|solubil/i],
        [3, /catalis|oxida|redução/i], [3, /polímero|substância/i],
        [3, /estequi|ligação química/i], [3, /concentração/i],
        [3, /equilíbrio químico|entalpia|eletrólise/i],
        [3, /tabela periódica|função orgânica/i], [1, /molécul|elétron/i],
        [1, /combustível|gás/i],
      ],
      Física: [
        [3, /velocidade|aceleração/i], [3, /força|newton/i],
        [3, /potência|tensão/i], [3, /corrente elétrica|circuito/i],
        [3, /onda|frequência|óptica/i], [3, /pressão|vazão/i],
        [3, /campo elétrico|magnét/i], [3, /gravidade/i],
        [3, /radiação|resistência elétrica/i], [1, /energia|massa/i],
        [1, /movimento|luz|som\b/i], [1, /calor|temperatura|térmic/i],
      ],
    };
    const scores = Object.entries(indicators).map(
      ([subject, subjectIndicators]) => ({
        subject,
        score: subjectIndicators.reduce(
          (score, [weight, pattern]) =>
            score + (pattern.test(text) ? weight : 0),
          0,
        ),
      }),
    );
    const best = scores.sort(
      (left, right) => right.score - left.score,
    )[0];
    return best && best.score > 0
      ? best.subject
      : "Interpretação e resolução de problemas";
  }

  const rules = {
    "Ciências Humanas e suas Tecnologias": [
      [
        "Filosofia",
        /filosof|ética|moral|epistem|metafís|aristót|platão|kant|nietzsche|descartes|sócrates|hobbes|rousseau/i,
      ],
      [
        "História",
        /históric|século|império|coloni|revolução|guerra|república|ditadura|escrav|medieval|antiguidade|independência|industrializa|monarquia|civilização|aboli|regime|governo|getúlio|vargas|militar|conquista|feudal|nazis|fascis|guerra fria|imperialismo/i,
      ],
      [
        "Geografia",
        /territór|geograf|clima|relevo|cartogr|urbaniza|migra|globaliza|paisagem|bioma|agricultura|demograf|geopolít|hidrogr|espaço urbano|população|vegetação|solo|agrár|recursos naturais|sustentab/i,
      ],
      [
        "Sociologia",
        /sociolog|sociedade|movimento social|cidadania|trabalho|desigualdade|identidade|cultura|durkheim|weber|marx|classe social|relações sociais|direitos|gênero|racismo|preconceito/i,
      ],
    ],
    "Linguagens, Códigos e suas Tecnologias": [
      [
        "Literatura",
        /poema|poesia|romance|narrador|personagem|liter|conto|crônica|verso|obra de/i,
      ],
      [
        "Artes",
        /pintura|escultura|artista|fotografia|cinema|teatro|música|dança|arte\b/i,
      ],
      [
        "Educação Física",
        /esporte|atleta|olímp|futebol|jogo|exercício físico|corpo|luta|dança/i,
      ],
      [
        "Tecnologias da comunicação",
        /internet|rede social|mídia|digital|tecnologia|aplicativo|site|comunicação/i,
      ],
      [
        "Variação linguística",
        /variação|dialeto|oralidade|fala|preconceito linguístico|regionalismo|língua portuguesa/i,
      ],
      [
        "Gramática e recursos linguísticos",
        /pronome|verbo|adjetivo|substantivo|conjunção|pontuação|sintaxe|semântica|coesão|figura de linguagem/i,
      ],
    ],
    "Matemática e suas Tecnologias": [
      [
        "Geometria",
        /área|volume|perímetro|ângulo|triângulo|círculo|circunferência|quadrado|retângulo|prisma|cilindro|plano cartesiano|distância/i,
      ],
      [
        "Estatística e probabilidade",
        /probabilidade|média|mediana|moda|gráfico|tabela|amostra|frequência|estatíst/i,
      ],
      [
        "Funções",
        /função|gráfico de|crescimento|decrescimento|exponencial|logarit|equação/i,
      ],
      [
        "Matemática financeira",
        /juros|taxa|desconto|financiamento|empréstimo|rendimento|capital|prestação/i,
      ],
      [
        "Álgebra",
        /sistema|expressão|polinôm|incógnita|matriz|progressão|sequência/i,
      ],
      [
        "Aritmética e proporcionalidade",
        /porcentagem|proporção|razão|escala|fração|divis|múltiplo|quantidade/i,
      ],
    ],
  };
  const matched = rules[area]?.find(([, pattern]) => pattern.test(text));
  return matched?.[0] ?? "Interpretação e resolução de problemas";
}

const QUESTION_TOPIC_IDS = new Map([
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
  [
    "Ciências Humanas (Interdisciplinar)::Interpretação e resolução de problemas",
    10105,
  ],
  ["Biologia::Biologia", 10201],
  ["Física::Física", 10202],
  ["Química::Química", 10203],
  [
    "Ciências da Natureza (Interdisciplinar)::Interpretação e resolução de problemas",
    10204,
  ],
  ["Matemática::Geometria", 10301],
  ["Matemática::Estatística e probabilidade", 10302],
  ["Matemática::Funções", 10303],
  ["Matemática::Matemática financeira", 10304],
  ["Matemática::Álgebra", 10305],
  ["Matemática::Aritmética e proporcionalidade", 10306],
  ["Matemática::Interpretação e resolução de problemas", 10307],
]);

function questionDiscipline(area, subject) {
  if (area === "Língua Inglesa" || area === "Língua Espanhola") return area;
  if (area === "Matemática e suas Tecnologias") return "Matemática";
  if (area === "Ciências da Natureza e suas Tecnologias") {
    return subject === "Interpretação e resolução de problemas"
      ? "Ciências da Natureza (Interdisciplinar)"
      : subject;
  }
  if (area === "Ciências Humanas e suas Tecnologias") {
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

function contextDefinition(year, day) {
  if (year === 2025 && day === 1) {
    return {
      page: 6,
      file: "context-q-006-010.png",
      questions: new Set([6, 7, 8, 9, 10]),
    };
  }
  return null;
}

async function extractDay(year, day, imageDirectory) {
  const layout = layoutFor(year);
  const range = dayRange(day);
  const sourceFile = path.join(
    root,
    `enem/${year}/prova_dia_${day}_caderno_azul.pdf`,
  );
  const { task, document } = await openDocument(sourceFile);
  const answers = await readAnswerKey(year, day);
  const markers = [];
  const pageContents = new Map();
  const occurrenceByNumber = new Map();
  const context = contextDefinition(year, day);

  for (let pageNumber = 2; pageNumber <= 31; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pageContents.set(pageNumber, content);
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const number = markerNumber(year, item);
      if (number === null || number < range.min || number > range.max) continue;
      const occurrence = (occurrenceByNumber.get(number) ?? 0) + 1;
      occurrenceByNumber.set(number, occurrence);
      const side =
        item.transform[4] < layout.leftBounds[1] - 5 ? "left" : "right";
      markers.push({
        number,
        variant: variantFor({ number }, occurrence, year, day),
        pageNumber,
        side,
        cellIndex: (pageNumber - 2) * 2 + (side === "right" ? 1 : 0),
        y: item.transform[5],
      });
    }
  }

  markers.sort(
    (left, right) =>
      left.cellIndex - right.cellIndex || right.y - left.y,
  );
  const expectedMarkers =
    range.max - range.min + 1 + (day === languageRange(year).day ? 5 : 0);
  if (markers.length !== expectedMarkers) {
    throw new Error(
      `${year}/dia ${day}: ${markers.length}/${expectedMarkers} marcadores.`,
    );
  }

  // Some official PDFs keep a broken embedded-font promise after text
  // extraction, so rasterization uses a fresh document instance.
  const renderSource = reuseImages
    ? null
    : await openDocument(sourceFile);
  const renderDocumentTask = renderSource?.task;
  const renderDocument = renderSource?.document;
  const pageCanvases = new Map();
  async function getPageCanvas(pageNumber) {
    if (!renderDocument) {
      throw new Error("Renderização indisponível no modo --reuse-images.");
    }
    if (!pageCanvases.has(pageNumber)) {
      pageCanvases.set(
        pageNumber,
        await renderPage(renderDocument, pageNumber),
      );
    }
    return pageCanvases.get(pageNumber);
  }

  let contextPath = null;
  if (context) {
    const file = path.join(imageDirectory, context.file);
    if (!reuseImages) {
      const source = await getPageCanvas(context.page);
      const cropped = cropCanvas(source, {
        x1: layout.fullBounds?.[0] ?? layout.leftBounds[0],
        x2: layout.fullBounds?.[1] ?? layout.rightBounds[1],
        yTop: layout.top,
        yBottom: layout.bottom,
      });
      fs.writeFileSync(file, cropped.toBuffer("image/png"));
    } else if (!fs.existsSync(file)) {
      throw new Error(`${year}: imagem de contexto não encontrada: ${file}`);
    }
    contextPath = `/questions/enem-${year}/${context.file}`;
  }

  const pageModes = new Map();
  for (let pageNumber = 2; pageNumber <= 31; pageNumber += 1) {
    const pageMarkers = markers.filter(
      (marker) => marker.pageNumber === pageNumber,
    );
    const content = pageContents.get(pageNumber);
    const hasFullWidthText = content?.items.some(
      (item) =>
        "str" in item &&
        item.str.trim().length > 15 &&
        item.transform[5] > layout.bottom + 8 &&
        item.transform[5] < layout.top - 8 &&
        item.transform[4] < 285 &&
        item.transform[4] + (item.width ?? 0) > 345,
    );
    pageModes.set(
      pageNumber,
      !pageMarkers.some((marker) => marker.side === "right") &&
        (layout.dynamicColumns || hasFullWidthText)
        ? "full"
        : "columns",
    );
  }
  const cells = [];
  for (let pageNumber = 2; pageNumber <= 31; pageNumber += 1) {
    if (pageModes.get(pageNumber) === "full") {
      cells.push({
        pageNumber,
        side: "full",
        bounds: layout.fullBounds ?? [
          layout.leftBounds[0],
          layout.rightBounds[1],
        ],
      });
    } else {
      cells.push({
        pageNumber,
        side: "left",
        bounds: layout.leftBounds,
      });
      cells.push({
        pageNumber,
        side: "right",
        bounds: layout.rightBounds,
      });
    }
  }
  for (const marker of markers) {
    const side =
      pageModes.get(marker.pageNumber) === "full"
        ? "full"
        : marker.side;
    marker.side = side;
    marker.cellIndex = cells.findIndex(
      (cell) =>
        cell.pageNumber === marker.pageNumber && cell.side === side,
    );
  }
  markers.sort(
    (left, right) =>
      left.cellIndex - right.cellIndex || right.y - left.y,
  );

  const records = [];
  const imageStats = [];
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex += 1) {
    const marker = markers[markerIndex];
    const next = markers[markerIndex + 1];
    const sectionBoundary =
      next &&
      ((marker.number === 45 && next.number === 46) ||
        (marker.number === 135 && next.number === 136));
    const pieceDefinitions = [];
    const nextCellOnPage = cells[marker.cellIndex + 1];
    const lastCellIndex = next
      ? next.cellIndex
      : marker.cellIndex +
        (nextCellOnPage?.pageNumber === marker.pageNumber ? 1 : 0);

    for (
      let cellIndex = marker.cellIndex;
      cellIndex <= lastCellIndex;
      cellIndex += 1
    ) {
      const cell = cells[cellIndex];
      if (!cell) break;
      const { pageNumber, side } = cell;
      if (context && pageNumber === context.page) continue;
      if (
        sectionBoundary &&
        next &&
        ((pageNumber > marker.pageNumber &&
          pageNumber < next.pageNumber) ||
          (cellIndex === next.cellIndex &&
            cellIndex !== marker.cellIndex))
      ) {
        continue;
      }
      const [x1, x2] = cell.bounds;
      let yTop = layout.top;
      let yBottom = layout.bottom;
      if (cellIndex === marker.cellIndex) {
        yTop = Math.min(marker.y + layout.markerMargin, layout.top);
      }
      if (next && cellIndex === next.cellIndex) {
        yBottom = Math.min(
          next.y + layout.markerMargin,
          layout.top,
        );
      }
      if (yTop - yBottom < 2) continue;
      pieceDefinitions.push({
        pageNumber,
        side,
        x1,
        x2,
        yTop,
        yBottom,
      });
    }

    const variantSuffix = marker.variant
      ? `-${marker.variant.toLowerCase()}`
      : "";
    const fileName = `q-${String(marker.number).padStart(3, "0")}${variantSuffix}.png`;
    const imageFile = path.join(imageDirectory, fileName);
    let buffer;
    let imageWidth;
    let imageHeight;
    let pieceCount;
    if (reuseImages) {
      buffer = fs.readFileSync(imageFile);
      if (
        buffer.length < 24 ||
        buffer.subarray(1, 4).toString("ascii") !== "PNG"
      ) {
        throw new Error(`${year}: imagem PNG inválida: ${imageFile}`);
      }
      imageWidth = buffer.readUInt32BE(16);
      imageHeight = buffer.readUInt32BE(20);
      pieceCount = pieceDefinitions.length;
    } else {
      const pieces = [];
      for (const definition of pieceDefinitions) {
        const source = await getPageCanvas(definition.pageNumber);
        const trimmed = trimCanvasVertically(
          cropCanvas(source, definition),
        );
        if (trimmed) pieces.push(trimmed);
      }
      if (pieces.length === 0) {
        throw new Error(
          `${year}/dia ${day}/questão ${marker.number}: recorte vazio.`,
        );
      }
      const composed = composePieces(pieces);
      buffer = composed.toBuffer("image/png");
      imageWidth = composed.width;
      imageHeight = composed.height;
      pieceCount = pieces.length;
      fs.writeFileSync(imageFile, buffer);
    }

    const text = textFromPieces(pieceDefinitions, pageContents);
    const area = areaFor(
      year,
      day,
      marker.number,
      marker.variant,
    );
    const subject = subjectFor(area, text);
    const discipline = questionDiscipline(area, subject);
    const correctAnswer = answerFor(
      answers,
      marker.number,
      marker.variant,
      year,
      day,
    );
    if (correctAnswer === undefined) {
      throw new Error(
        `${year}/dia ${day}/questão ${marker.number}: resposta ausente.`,
      );
    }
    const optionLabels = new Set(
      pieceDefinitions.flatMap((piece) => {
        const content = pageContents.get(piece.pageNumber);
        if (!content) return [];
        return content.items
          .filter(
            (item) =>
              "str" in item &&
              /^[A-E]$/.test(item.str.trim()) &&
              item.transform[4] >= piece.x1 - 2 &&
              item.transform[4] <= piece.x2 + 2 &&
              item.transform[5] <= piece.yTop + 2 &&
              item.transform[5] >= piece.yBottom - 2,
          )
          .map((item) => item.str.trim());
      }),
    );

    records.push({
      number: marker.number,
      examDay: day,
      variant: marker.variant,
      discipline,
      subject,
      weight: 1,
      sourcePage: marker.pageNumber,
      sourceImage: `/questions/enem-${year}/${fileName}`,
      contextImage:
        context?.questions.has(marker.number) && marker.variant === ""
          ? contextPath
          : null,
      correctAnswer,
      annulled: correctAnswer === null,
      studyTopicId:
        QUESTION_TOPIC_IDS.get(`${discipline}::${subject}`) ?? null,
    });
    imageStats.push({
      key: `${marker.number}:${marker.variant}`,
      width: imageWidth,
      height: imageHeight,
      pieces: pieceCount,
      optionLabelCount: optionLabels.size,
      bytes: buffer.length,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    });
  }

  await task.destroy();
  await renderDocumentTask?.destroy();
  return {
    records,
    stats: {
      day,
      markerCount: markers.length,
      recordCount: records.length,
      imageStats,
    },
  };
}

function validateYear(year, records, dayStats) {
  const errors = [];
  const keys = records.map(
    (record) => `${record.number}:${record.variant}`,
  );
  if (records.length !== 185) errors.push(`registros: ${records.length}/185`);
  if (new Set(keys).size !== records.length) {
    errors.push("há chaves de questão duplicadas");
  }
  const english = records.filter(
    (record) => record.variant === "ENGLISH",
  ).length;
  const spanish = records.filter(
    (record) => record.variant === "SPANISH",
  ).length;
  const common = records.filter((record) => record.variant === "").length;
  if (english !== 5 || spanish !== 5 || common !== 175) {
    errors.push(
      `variantes inválidas: comum=${common}, inglês=${english}, espanhol=${spanish}`,
    );
  }
  if (
    records.some(
      (record) =>
        !record.discipline ||
        !record.subject ||
        record.correctAnswer === undefined,
    )
  ) {
    errors.push("há classificação ou resposta ausente");
  }
  const allImages = dayStats.flatMap((day) => day.imageStats);
  if (
    allImages.some(
      (image) =>
        image.width < 200 ||
        image.height < 150 ||
        image.bytes < 1_000,
    )
  ) {
    errors.push("há recortes com dimensão ou tamanho inválido");
  }
  if (errors.length > 0) {
    throw new Error(`${year}: ${errors.join("; ")}.`);
  }

  const lowOptionConfidence = allImages
    .filter((image) => image.optionLabelCount < 4)
    .map((image) => image.key);
  return {
    year,
    valid: true,
    recordCount: records.length,
    effectiveQuestionCountPerLanguage: 180,
    commonQuestionCount: common,
    englishQuestionCount: english,
    spanishQuestionCount: spanish,
    answeredQuestionCount: records.filter(
      (record) => record.correctAnswer !== null,
    ).length,
    annulledQuestionCount: records.filter((record) => record.annulled).length,
    disciplineCounts: Object.fromEntries(
      [...Map.groupBy(records, (record) => record.discipline).entries()].map(
        ([discipline, questions]) => [
          discipline,
          questions.length,
        ],
      ),
    ),
    imageCount: allImages.length,
    minimumImageHeight: Math.min(
      ...allImages.map((image) => image.height),
    ),
    maximumImageHeight: Math.max(
      ...allImages.map((image) => image.height),
    ),
    continuationImageCount: allImages.filter((image) => image.pieces > 1)
      .length,
    lowOptionConfidence,
    imageBytes: allImages.reduce((total, image) => total + image.bytes, 0),
    days: dayStats.map(({ imageStats, ...day }) => day),
  };
}

async function main() {
  fs.mkdirSync(outputDataDirectory, { recursive: true });
  fs.mkdirSync(publicQuestionsDirectory, { recursive: true });
  const reportFile = path.join(root, "enem/extraction-validation.json");
  const existingReport = fs.existsSync(reportFile)
    ? JSON.parse(fs.readFileSync(reportFile, "utf8"))
    : [];
  const reports = new Map(existingReport.map((report) => [report.year, report]));

  for (const year of selectedYears) {
    const imageDirectory = path.join(
      publicQuestionsDirectory,
      `enem-${year}`,
    );
    fs.mkdirSync(imageDirectory, { recursive: true });
    const days = [];
    for (const day of [1, 2]) {
      process.stdout.write(`ENEM ${year}, dia ${day}: extraindo... `);
      const extracted = await extractDay(year, day, imageDirectory);
      days.push(extracted);
      process.stdout.write(`${extracted.records.length} questões.\n`);
    }
    const records = days
      .flatMap((day) => day.records)
      .sort(
        (left, right) =>
          left.number - right.number ||
          left.variant.localeCompare(right.variant),
      );
    const report = validateYear(
      year,
      records,
      days.map((day) => day.stats),
    );
    fs.writeFileSync(
      path.join(outputDataDirectory, `enem-${year}-questions.json`),
      `${JSON.stringify(records, null, 2)}\n`,
    );
    reports.set(year, report);
    fs.writeFileSync(
      reportFile,
      `${JSON.stringify(
        [...reports.values()].sort((left, right) => left.year - right.year),
        null,
        2,
      )}\n`,
    );
    console.log(
      `ENEM ${year}: validado (${report.recordCount} registros, ${report.annulledQuestionCount} anuladas, ${report.lowOptionConfidence.length} alertas visuais).`,
    );
  }
}

await main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
