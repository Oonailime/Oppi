function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function candidate(id, ...signals) {
  return { id, signals };
}

const taxonomy = {
  "Língua Portuguesa": [
    candidate(11004, [5, /\bcoesao\b|conectiv|referenciacao|anafor|catáfor|elipse/]),
    candidate(11003, [5, /argument|tese\b|ponto de vista|convencimento|persuas/]),
    candidate(11005, [5, /variacao linguistic|norma[- ]padrao|registro|oralidade|dialeto|regionalismo|preconceito linguistic/]),
    candidate(11002, [5, /semant|relacao logica|causa e consequencia|polissem|ambiguidade|progressao tematica/]),
    candidate(11001, [3, /genero textual|narracao|descricao|exposicao|injuncao|cronica|noticia|anuncio|campanha|charge|tirinha|leitura/]),
  ],
  Literatura: [
    candidate(11006, [4, /formacao nacional|patrimonio literario|cosmopolit|localismo/]),
    candidate(11007, [4, /genero lirico|genero dramatico|genero epico|narrador|personagem|eu lirico|poema|poesia|romance|conto|drama/]),
    candidate(11008, [5, /modernis|romantis|realismo|naturalismo|parnas|simbolis|arcadis|barroco|quinhentis|vanguarda|momento historico|ruptura/]),
  ],
  Artes: [
    candidate(11010, [4, /identidade|diversidade|multicultural|preconceito|padrao de beleza|inclusao|minoria|cidadania/]),
    candidate(11009, [3, /pintura|escultura|fotografia|cinema|teatro|musica|danca|artista|obra|performance|instalacao/]),
  ],
  "Educação Física": [
    candidate(11012, [4, /saude|lazer|exercicio|condicionamento|esporte|atleta|futebol|jogo|luta|brincadeira|qualidade de vida/]),
    candidate(11011, [4, /identidade|linguagem corporal|expressao corporal|corpo|simbolo|cultura/]),
  ],
  "Tecnologias da Comunicação": [
    candidate(11014, [5, /genero digital|rede social|internet|site|aplicativo|blog|meme|hipertexto|suporte digital/]),
    candidate(11013, [4, /sistema de comunicacao|meio de comunicacao|informacao|midia|tecnologia/]),
  ],
  Física: [
    candidate(11205, [6, /corrente eletrica|circuito|resistor|resistencia eletrica|tensao|voltagem|potencial eletrico|campo eletrico|carga eletrica|capacitor|lei de ohm|efeito joule|campo magnetico|ima\b|eletromagnet/]),
    candidate(11207, [6, /temperatura|calor\b|termic|termodinam|dilatacao|calor especifico|calor latente|maquina termica|carnot|gas ideal|mudanca de estado/]),
    candidate(11206, [6, /onda\b|ondulator|frequencia|comprimento de onda|reflexao|refracao|lente|espelho|imagem optica|som\b|radiacao|interferencia|difracao/]),
    candidate(11204, [6, /gravitacao|gravidade|kepler|planeta|orbita|corpo celeste|universo|mare\b/]),
    candidate(11202, [6, /velocidade|aceleracao|forca\b|newton|movimento|impulso|momento linear|torque|atrito|equilibrio|pressao|empuxo|pascal|arquimedes|stevin|vazao/]),
    candidate(11203, [5, /trabalho\b|energia cinetica|energia potencial|potencia\b|conservacao de energia|energia mecanica/]),
    candidate(11201, [5, /notacao cientifica|ordem de grandeza|sistema internacional|grandeza vetorial|vetor\b|unidade de medida/]),
  ],
  Química: [
    candidate(11308, [7, /funcao organica|hidrocarbon|alcool\b|aldeido|cetona|acido carboxilico|amina\b|amida\b|ester\b|eter\b|polimero|fermentacao|proteina|enzima|sabao|detergente/]),
    candidate(11307, [7, /equilibrio quimico|constante de equilibrio|produto ionico|hidrolise|deslocamento do equilibrio/], [3, /\bph\b/]),
    candidate(11306, [7, /cinetica|velocidade de reacao|energia de ativacao|catalisador/]),
    candidate(11305, [7, /entalpia|termoquim|lei de hess|oxirreduc|pilha\b|eletrolise|faraday|fissao|fusao nuclear|radioativ|radioisotopo/]),
    candidate(11310, [7, /petroleo|gas natural|carvao|hulha|biomassa|biocombust|combustivel fossil|lixo atomico|energia nuclear/]),
    candidate(11309, [6, /industria quimica|mineracao|metalurgia|tratamento de agua|poluicao|contaminacao|agricultura|impacto ambiental|meio ambiente/]),
    candidate(11304, [6, /solucao|solubil|concentracao|coloide|suspensao|propriedade coligativa|acido\b|base\b|sal\b|oxido|neutralizacao|agua\b/]),
    candidate(11303, [6, /mistura|separacao|ligacao ionica|ligacao covalente|ligacao metalica|polaridade|forca intermolecular|liga metalica|material/]),
    candidate(11302, [6, /estequiometr|balanceamento|lei ponderal|massa molar|volume molar|numero de mol|constante de avogadro|rendimento/]),
    candidate(11301, [5, /transformacao quimica|reacao quimica|modelo atomico|atomo\b|isotopo|tabela periodica|gas ideal|teoria cinetica/]),
  ],
  Biologia: [
    candidate(11407, [8, /dna recombinante|clonagem|celula[- ]tronco|transgenic|biotecnolog|engenharia genetica|teste de paternidade/]),
    candidate(11402, [7, /hereditar|mendel|gene\b|genet|cromossom|mutacao|grupo sanguineo|antigeno|anticorpo|autoimune|neoplasia|cancer/]),
    candidate(11404, [7, /ecossistema|ecologia|habitat|nicho|teia alimentar|cadeia alimentar|sucessao ecologica|populacao|ciclo biogeoquimico|bioma|biodiversidade|desmatamento|saneamento/]),
    candidate(11405, [7, /evolucao|darwin|selecao natural|selecao artificial|origem da vida|teoria sintetica|ancestral/]),
    candidate(11406, [7, /doenca|saude|vacina|profilaxia|primeiros socorros|infeccao sexual|dst\b|ist\b|droga|gravidez|obesidade|violencia|idh\b/]),
    candidate(11401, [7, /celula\b|membrana|citoplasma|nucleo|mitose|meiose|metabolismo|fotossintese|respiracao celular|sintese proteica|tecido/]),
    candidate(11403, [6, /virus|bacteria|procarion|eucarion|autotro|heterotro|taxonomia|sistematica|embriologia|anatomia|fisiologia|ser vivo|organismo/]),
  ],
  História: [
    candidate(11508, [8, /nazis|fascis|franquismo|salazarismo|stalinismo|estado novo|ditadura|totalitar|regime militar/]),
    candidate(11507, [8, /revolucao russa|revolucao bolchevique|revolucao chinesa|revolucao cubana/]),
    candidate(11506, [7, /imperialismo|guerra mundial|guerra fria|ocupacao da africa|ocupacao da asia|geopolitic/]),
    candidate(11505, [7, /brasil imperio|periodo imperial|dom pedro|monarquia|regencia|segundo reinado|abolicao/]),
    candidate(11504, [7, /revolucao francesa|revolucao moderna|independencia|colonia da america|iluminismo/]),
    candidate(11503, [7, /antiguidade|grecia|roma antiga|democracia antiga|cidadania antiga/]),
    candidate(11510, [7, /revolucao industrial|sistema fabril|fordismo|toyotismo|industrializacao/]),
    candidate(11509, [7, /acucar|mineracao colonial|economia cafeeira|cafe\b|borracha|agroexport/]),
    candidate(11501, [7, /conquista da america|colonizacao da america|europeus e indigenas|escravidao|resistencia indigena|resistencia africana/]),
    candidate(11502, [6, /povos africanos|povos indigenas|negro no brasil|formacao brasileira|patrimonio cultural/]),
  ],
  Geografia: [
    candidate(11612, [8, /cartograf|projecao|escala cartografica|mapa tematico|latitude|longitude|sensoriamento remoto|geoprocessamento/]),
    candidate(11610, [8, /atmosfera|clima\b|climatic|massa de ar|precipitacao|temperatura media/]),
    candidate(11609, [8, /estrutura da terra|relevo|geomorf|solo\b|tecton|erosao/]),
    candidate(11611, [8, /vegetacao|dominio morfoclimatico|biogeograf|floresta|cerrado|caatinga|pampa|pantanal/]),
    candidate(11608, [7, /mudanca climatica|ilha de calor|efeito estufa|chuva acida|camada de ozonio|unidade de conservacao|corredor ecologico|zoneamento/]),
    candidate(11607, [7, /recurso natural|mineral|energia|hidric|bacia hidrografica|impacto ambiental/]),
    candidate(11606, [7, /espaco agrario|agricultura|agronegocio|agricultura familiar|campo[- ]cidade|estrutura agraria|reforma agraria/]),
    candidate(11605, [7, /globalizacao|telecomunicacao|economia global|multinacional|fluxo financeiro/]),
    candidate(11604, [7, /urbanizacao|rede urbana|hierarquia urbana|segregacao espacial|metropole|cidade\b/]),
    candidate(11603, [7, /geopolitica|ordem mundial|organismo multilateral|fronteira|conflito internacional/]),
    candidate(11602, [7, /migracao|imigracao|emigracao|fluxo populacional|refugiado/]),
    candidate(11601, [6, /formacao territorial|regiao brasileira|regionalizacao|reordenamento territorial/]),
  ],
  Filosofia: [
    candidate(11704, [7, /etica ambiental|sustentabilidade|sociedade e natureza/]),
    candidate(11703, [7, /etica\b|moral\b|justica|direitos humanos|dilema etico|acao politica/]),
    candidate(11702, [7, /liberalismo|capitalismo|marx|critica social|contrato social/]),
    candidate(11701, [7, /estado\b|cidadania|democracia|legitimidade|hobbes|locke|rousseau|aristoteles|platao/]),
  ],
  Sociologia: [
    candidate(11805, [7, /campo\b|cidade\b|rural|urbano|agronegocio|agricultura familiar|assalariado/]),
    candidate(11804, [7, /desigualdade|segregacao|pobreza|politica afirmativa|acao afirmativa|racismo|discriminacao/]),
    candidate(11803, [7, /trabalho|producao|escravismo|feudalismo|capitalismo|socialismo|classe social|fordismo|toyotismo/]),
    candidate(11802, [7, /movimento social|acao coletiva|participacao politica|conquista de direitos|manifestacao/]),
    candidate(11801, [7, /cultura|identidade|patrimonio|diversidade|memoria|socializacao/]),
  ],
  Matemática: [
    candidate(11921, [8, /juros|taxa de juros|desconto|financiamento|emprestimo|prestacao|capital|rendimento/]),
    candidate(11909, [8, /probabilidade|espaco amostral|evento aleatorio/]),
    candidate(11908, [8, /media\b|mediana|moda\b|variancia|desvio padrao|tendencia central/]),
    candidate(11907, [7, /grafico|tabela|frequencia|dados|tendencia|interpolacao|extrapolacao/]),
    candidate(11912, [8, /exponencial|logarit/]),
    candidate(11913, [8, /ciclo trigonometrico|funcao seno|funcao cosseno|funcao trigonometrica|periodicidade/]),
    candidate(11910, [7, /funcao do primeiro grau|funcao do segundo grau|funcao afim|funcao quadratica|parabola/]),
    candidate(11911, [7, /funcao polinomial|funcao racional|polinomio/]),
    candidate(11916, [8, /paralel|perpendicular|sistema de equacoes/]),
    candidate(11915, [8, /plano cartesiano|equacao da reta|equacao da circunferencia|coordenada/]),
    candidate(11914, [7, /equacao|inequacao|incognita/]),
    candidate(11906, [8, /relacao metrica|circunferencia|trigonometria|seno\b|cosseno|tangente/]),
    candidate(11905, [8, /congruencia|semelhanca|teorema de tales/]),
    candidate(11903, [7, /comprimento|perimetro|area\b|volume/]),
    candidate(11904, [7, /angulo|retas\b|simetria/]),
    candidate(11901, [6, /triangulo|quadrado|retangulo|poligono|prisma|piramide|cilindro|cone\b|esfera|figura plana|figura espacial/]),
    candidate(11902, [7, /unidade de medida|conversao|escala\b|grandeza/]),
    candidate(11920, [7, /sequencia|progressao|principio de contagem|combinacao|arranjo|permutacao/]),
    candidate(11918, [7, /divisibilidade|fatoracao|multiplo|divisor|numero primo|mdc\b|mmc\b/]),
    candidate(11919, [7, /razao|proporcao|porcentagem|diretamente proporcional|inversamente proporcional/]),
    candidate(11917, [5, /numero natural|numero inteiro|numero racional|numero real|fracao|operacao/]),
  ],
};

const fallbackTopic = {
  "Língua Portuguesa": 11001,
  Literatura: 11008,
  Artes: 11009,
  "Educação Física": 11012,
  "Tecnologias da Comunicação": 11014,
  Física: 11208,
  Química: 11311,
  Biologia: 11408,
  História: 11511,
  Geografia: 11613,
  Filosofia: 11705,
  Sociologia: 11806,
  Matemática: 11922,
  "Ciências Humanas (Interdisciplinar)": 10105,
  "Ciências da Natureza (Interdisciplinar)": 10204,
  "Língua Inglesa": 10001,
  "Língua Espanhola": 10002,
};

export function classifyEnemStudyTopic(discipline, sourceText) {
  const candidates = taxonomy[discipline];
  if (!candidates) return fallbackTopic[discipline] ?? null;
  const text = normalize(sourceText);
  const ranked = candidates
    .map((item) => ({
      id: item.id,
      score: item.signals.reduce(
        (total, [weight, pattern]) =>
          total + (pattern.test(text) ? weight : 0),
        0,
      ),
    }))
    .sort((left, right) => right.score - left.score || left.id - right.id);
  return ranked[0]?.score > 0
    ? ranked[0].id
    : (fallbackTopic[discipline] ?? null);
}
