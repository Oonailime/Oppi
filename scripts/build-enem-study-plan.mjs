import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(
  root,
  "apps/api/prisma/data/enem-study-topics.json",
);
const topics = [];

function add(
  id,
  module,
  discipline,
  syllabusItem,
  subject,
  detail,
  page,
  suggestedPriority = "Alta",
) {
  topics.push({
    id,
    module,
    discipline,
    syllabusItem,
    subject,
    detail,
    page: `Matriz de Referência ENEM 2026 · p. ${page}`,
    suggestedPriority,
  });
}

// Tópicos-âncora também usados para relacionar cada questão categorizada.
add(10001, "Linguagens", "Língua Inglesa", "Língua estrangeira moderna", "Interpretação de texto em língua inglesa", "Vocabulário e expressões, tema, estruturas linguísticas, função e uso social do texto, acesso a informações, tecnologias, culturas e diversidade cultural.", 2);
add(10002, "Linguagens", "Língua Espanhola", "Língua estrangeira moderna", "Interpretação de texto em língua espanhola", "Vocabulário e expressões, tema, estruturas linguísticas, função e uso social do texto, acesso a informações, tecnologias, culturas e diversidade cultural.", 2);
add(10003, "Linguagens", "Língua Portuguesa", "Estudo do texto", "Interpretação e resolução de problemas", "Sequências discursivas, gêneros textuais, composição, leitura, produção e circulação de textos em diferentes esferas sociais.", 14);
add(10004, "Linguagens", "Literatura", "Estudo do texto literário", "Literatura", "Produção literária e processo social, formação nacional, patrimônio literário, gêneros, construção, recepção, continuidade, ruptura e diálogo com outras artes.", "14–15");
add(10005, "Linguagens", "Artes", "Produção e recepção de textos artísticos", "Artes", "Artes visuais, teatro, música e dança: estruturas, contextos, fontes de criação, identidade, cidadania, inclusão, diversidade e multiculturalidade.", 14);
add(10006, "Linguagens", "Educação Física", "Estudo das práticas corporais", "Educação Física", "Linguagem corporal, identidade, lazer, saúde, expressão cultural, autonomia, condicionamento, esporte, dança, lutas, jogos e brincadeiras.", 14);
add(10007, "Linguagens", "Tecnologias da Comunicação", "Estudo dos gêneros digitais", "Tecnologias da comunicação", "Suportes e gêneros digitais, interlocutores, recursos linguísticos, cultura de massa, impacto e função social das tecnologias da comunicação e informação.", 15);
add(10008, "Linguagens", "Língua Portuguesa", "Usos da língua", "Variação linguística", "Variações sociais, regionais e de registro; norma-padrão, oralidade, preconceito linguístico e adequação à situação comunicativa.", "4 e 15");
add(10009, "Linguagens", "Língua Portuguesa", "Aspectos linguísticos", "Gramática e recursos linguísticos", "Recursos expressivos, macroestrutura semântica, relações lógico-semânticas, seleção lexical, tempos e modos verbais, referência e coesão.", 15);

add(10101, "Ciências Humanas", "História", "Processos históricos", "História", "Temporalidade, fontes, memória, cultura, poder, trabalho, cidadania, conflitos, revoluções e transformações políticas e econômicas do Brasil e do mundo.", "22–23");
add(10102, "Ciências Humanas", "Geografia", "Espaço geográfico", "Geografia", "Território, cartografia, população, urbanização, produção, globalização, geopolítica, natureza, ambiente e sustentabilidade.", "22–24");
add(10103, "Ciências Humanas", "Filosofia", "Pensamento político e ética", "Filosofia", "Cidadania, democracia, Estado, direitos, pensamento liberal e seus críticos, ética, argumentação e relações entre sociedade e natureza.", "22–24");
add(10104, "Ciências Humanas", "Sociologia", "Organização social", "Sociologia", "Cultura, identidade, movimentos sociais, trabalho, desigualdade, cidadania, direitos, conflitos, vida urbana e transformações produtivas.", "22–23");
add(10105, "Ciências Humanas", "Ciências Humanas (Interdisciplinar)", "Integração das Ciências Humanas", "Interpretação e resolução de problemas", "Leitura interdisciplinar de documentos, mapas, processos históricos, relações sociais, cultura, política, economia e ambiente.", "11–13");

add(10201, "Ciências da Natureza", "Biologia", "Conhecimentos biológicos", "Biologia", "Seres vivos, células, genética, evolução, fisiologia, ecologia, saúde, biotecnologia e sustentabilidade em situações-problema.", "20–21");
add(10202, "Ciências da Natureza", "Física", "Conhecimentos físicos", "Física", "Mecânica, energia, gravitação, eletricidade, magnetismo, ondas, óptica, radiação, calor e termodinâmica em contextos naturais e tecnológicos.", "17–18");
add(10203, "Ciências da Natureza", "Química", "Conhecimentos químicos", "Química", "Matéria, transformações, cálculos, soluções, energia, cinética, equilíbrio, química orgânica, tecnologias, ambiente e recursos energéticos.", "18–19");
add(10204, "Ciências da Natureza", "Ciências da Natureza (Interdisciplinar)", "Integração das Ciências da Natureza", "Interpretação e resolução de problemas", "Método científico e integração de modelos, gráficos, experimentos e conhecimentos físicos, químicos e biológicos.", "8–10");

add(10301, "Matemática", "Matemática", "Conhecimentos geométricos", "Geometria", "Figuras planas e espaciais; unidades, escalas, comprimentos, áreas, volumes, ângulos, retas, simetria, congruência, semelhança, Tales, relações métricas, circunferência e trigonometria do ângulo agudo.", 16);
add(10302, "Matemática", "Matemática", "Estatística e probabilidade", "Estatística e probabilidade", "Representação e análise de dados, tabelas, gráficos, médias, moda, mediana, desvios, variância, amostragem e probabilidade.", "6–7 e 16");
add(10303, "Matemática", "Matemática", "Conhecimentos algébricos", "Funções", "Gráficos e funções do 1º e 2º graus, polinomiais, racionais, exponenciais e logarítmicas; ciclo e funções trigonométricas.", 16);
add(10304, "Matemática", "Matemática", "Conhecimentos numéricos", "Matemática financeira", "Porcentagem, juros, taxas, descontos, aumentos, financiamentos e análise de situações financeiras.", 16);
add(10305, "Matemática", "Matemática", "Conhecimentos algébricos", "Álgebra", "Equações, inequações, expressões, polinômios, sequências, progressões, plano cartesiano, retas, circunferências e sistemas de equações.", 16);
add(10306, "Matemática", "Matemática", "Conhecimentos numéricos", "Aritmética e proporcionalidade", "Naturais, inteiros, racionais e reais; operações, desigualdades, divisibilidade, fatoração, razões, proporções, dependência entre grandezas e princípios de contagem.", 16);
add(10307, "Matemática", "Matemática", "Modelagem matemática", "Interpretação e resolução de problemas", "Leitura matemática de situações cotidianas, modelagem, avaliação de resultados, argumentação quantitativa e integração entre números, álgebra, geometria, grandezas, gráficos e tabelas.", "5–7");

// Linguagens e Redação.
add(11001, "Linguagens", "Língua Portuguesa", "Gêneros e sequências discursivas", "Organização da composição textual", "Narração, descrição, exposição, injunção e argumentação; finalidade, suporte, interlocutores e circulação social dos gêneros.", 14);
add(11002, "Linguagens", "Língua Portuguesa", "Aspectos linguísticos", "Macroestrutura e relações lógico-semânticas", "Progressão temática, articulação de ideias e proposições, causa, consequência, condição, oposição, comparação e conclusão.", 15);
add(11003, "Linguagens", "Língua Portuguesa", "Texto argumentativo", "Pontos de vista e estratégias argumentativas", "Tese, argumentos, contra-argumentos, papéis sociais, propósitos comunicativos, convencimento e público-alvo.", "4 e 15");
add(11004, "Linguagens", "Língua Portuguesa", "Coesão textual", "Referência e articulação de sequências", "Referência pessoal, temporal e espacial; conectores, retomadas, substituições, elipses e construção da microestrutura.", 15);
add(11005, "Linguagens", "Língua Portuguesa", "Usos da língua", "Registro, formalidade e norma-padrão", "Adequação linguística ao contexto, seleção lexical, tempos e modos verbais e usos da norma-padrão.", "4 e 15");
add(11006, "Linguagens", "Literatura", "Formação literária", "Literatura e formação nacional", "Produção literária e processo social, cosmopolitismo e localismo, patrimônio e processos de formação da literatura brasileira.", "14–15");
add(11007, "Linguagens", "Literatura", "Gêneros literários", "Narrativa, lírica e drama", "Natureza, função, organização, estrutura, recursos expressivos, construção e recepção dos gêneros épico/narrativo, lírico e dramático.", 15);
add(11008, "Linguagens", "Literatura", "História literária", "Continuidade e ruptura na literatura brasileira", "Relações entre momento histórico, concepções artísticas, procedimentos de construção e valores sociais no patrimônio literário.", "3 e 15");
add(11009, "Linguagens", "Artes", "Linguagens artísticas", "Artes visuais, teatro, música e dança", "Estruturas morfológicas e sintáticas, contexto da obra e da comunidade, fontes de criação e inter-relações entre linguagens.", 14);
add(11010, "Linguagens", "Artes", "Arte, sociedade e identidade", "Diversidade estética e cultural", "Funções da arte, padrões de beleza, preconceitos, minorias sociais, inclusão, multiculturalidade, identidade e cidadania.", "3 e 14");
add(11011, "Linguagens", "Educação Física", "Cultura corporal", "Corpo, identidade e sociedade", "Performance, identidades juvenis, símbolos, expressão artística e cultural, autonomia e condicionamentos sociais do corpo.", 14);
add(11012, "Linguagens", "Educação Física", "Saúde e lazer", "Práticas corporais e qualidade de vida", "Exercício, esforço e condicionamento físico; lazer crítico; esporte, dança, lutas, jogos e brincadeiras.", 14);
add(11013, "Linguagens", "Tecnologias da Comunicação", "Sistemas de comunicação", "Impactos sociais da comunicação e informação", "Linguagens, recursos expressivos, funções sociais, posições críticas, produção de conhecimento e resolução de problemas.", "2 e 4");
add(11014, "Linguagens", "Tecnologias da Comunicação", "Gêneros digitais", "Comunicação na cultura digital", "Suporte, interlocutores, recursos linguísticos, texto de cultura de massa e função social das novas tecnologias.", 15);
add(11015, "Redação", "Redação", "Competência I", "Norma-padrão escrita", "Convenções da escrita formal, sintaxe, pontuação, ortografia, concordância, regência e escolha vocabular.", 1);
add(11016, "Redação", "Redação", "Competência II", "Compreensão do tema e repertório", "Atendimento ao recorte temático, estrutura dissertativo-argumentativa e repertório sociocultural produtivo.", 1);
add(11017, "Redação", "Redação", "Competência III", "Projeto de texto e argumentação", "Seleção, relação, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista.", 1);
add(11018, "Redação", "Redação", "Competência IV", "Coesão e mecanismos linguísticos", "Articulação entre parágrafos e períodos, referenciação, conectores e encadeamento lógico da argumentação.", 1);
add(11019, "Redação", "Redação", "Competência V", "Proposta de intervenção", "Agente, ação, meio ou modo, finalidade/efeito e detalhamento, com respeito aos direitos humanos.", 1);
add(11020, "Redação", "Redação", "Planejamento", "Introdução, desenvolvimento e conclusão", "Tese clara, parágrafos argumentativos consistentes, progressão temática e conclusão integrada à proposta de intervenção.", 1);

// Física.
add(11201, "Ciências da Natureza", "Física", "Fundamentos", "Grandezas, unidades, gráficos e vetores", "Ordem de grandeza, notação científica, SI, investigação, observações, mensurações, grandezas escalares e vetoriais e operações com vetores.", 17);
add(11202, "Ciências da Natureza", "Física", "Mecânica", "Movimento, forças e equilíbrio", "Tempo, espaço, velocidade, aceleração, inércia, referenciais, massa, momento linear, impulso, Newton, centro de massa, torque, atrito, peso, normal, tração, movimento circular e hidrostática.", 17);
add(11203, "Ciências da Natureza", "Física", "Mecânica", "Energia, trabalho e potência", "Energia cinética e potencial, trabalho, potência, conservação da energia mecânica, gravidade, forças conservativas e dissipativas.", 17);
add(11204, "Ciências da Natureza", "Física", "Gravitação", "Mecânica e funcionamento do Universo", "Peso, aceleração gravitacional, gravitação universal, leis de Kepler, corpos celestes, marés, clima e concepções sobre a origem e evolução do Universo.", 17);
add(11205, "Ciências da Natureza", "Física", "Eletromagnetismo", "Fenômenos elétricos e magnéticos", "Carga, corrente, Coulomb, campos e potenciais, capacitores, Joule, Ohm, resistência, tensão, potência, energia, circuitos, medidores, corrente contínua e alternada e magnetismo.", "17–18");
add(11206, "Ciências da Natureza", "Física", "Ondulatória e óptica", "Oscilações, ondas, óptica e radiação", "Pulsos, ondas, período, frequência, comprimento, velocidade, propagação, reflexão, refração, lentes, espelhos, formação de imagens e instrumentos ópticos.", 18);
add(11207, "Ciências da Natureza", "Física", "Termologia", "Calor e fenômenos térmicos", "Calor, temperatura, escalas, equilíbrio e transferência térmica, capacidade, calor específico, dilatação, estados físicos, calor latente, gases ideais, máquinas, Carnot, termodinâmica e ciclo da água.", 18);

// Química.
add(11301, "Ciências da Natureza", "Química", "Química geral", "Transformações químicas e estrutura da matéria", "Evidências de transformações, gases, Avogadro, teoria cinética, modelo corpuscular, modelos atômicos, estrutura atômica, isótopos, elementos, tabela periódica e reações.", 18);
add(11302, "Ciências da Natureza", "Química", "Química quantitativa", "Representação e estequiometria", "Fórmulas, balanceamento, leis ponderais, massa, volume, mol, massa molar, constante de Avogadro, rendimento e cálculos estequiométricos.", 18);
add(11303, "Ciências da Natureza", "Química", "Materiais", "Propriedades, ligações e separação de misturas", "Estados e mudanças, misturas e separação, substâncias, metais e ligas, ligações iônica, covalente e metálica, polaridade e forças intermoleculares.", 18);
add(11304, "Ciências da Natureza", "Química", "Soluções", "Água, soluções, ácidos, bases, sais e óxidos", "Solubilidade, concentração, coloides, suspensões, propriedades coligativas, formulação, nomenclatura, indicadores, condutividade e neutralização.", 19);
add(11305, "Ciências da Natureza", "Química", "Físico-química", "Termoquímica, eletroquímica e radioatividade", "Entalpia, calor de reação, Hess, oxirredução, potenciais, pilhas, eletrólise, Faraday, fissão, fusão, desintegração e radioisótopos.", 19);
add(11306, "Ciências da Natureza", "Química", "Cinética química", "Velocidade das transformações", "Velocidade, energia de ativação e efeitos de concentração, pressão, temperatura e catalisador.", 19);
add(11307, "Ciências da Natureza", "Química", "Equilíbrio químico", "Equilíbrio, pH, solubilidade e hidrólise", "Constantes, produto iônico da água, equilíbrio ácido-base, pH, solubilidade, hidrólise, deslocamento do equilíbrio e aplicações cotidianas.", 19);
add(11308, "Ciências da Natureza", "Química", "Química orgânica", "Compostos de carbono e polímeros", "Funções orgânicas, hidrocarbonetos, compostos oxigenados e nitrogenados, fermentação, macromoléculas, polímeros, óleos, gorduras, sabões, proteínas e enzimas.", 19);
add(11309, "Ciências da Natureza", "Química", "Química, tecnologia e ambiente", "Indústria, poluição e energia", "Agricultura, saúde, alimentos, indústria, mineração, metalurgia, tratamento de água, atmosfera, petróleo, gás, carvão, biomassa, biocombustíveis, energia nuclear e impactos ambientais.", 19);

// Biologia.
add(11401, "Ciências da Natureza", "Biologia", "Biologia celular", "Moléculas, células e tecidos", "Membrana, citoplasma, núcleo, divisão, bioquímica, metabolismo, fotossíntese, respiração, informação genética, síntese proteica, diferenciação, tecidos e células-tronco.", 20);
add(11402, "Ciências da Natureza", "Biologia", "Genética", "Hereditariedade e diversidade da vida", "Transmissão hereditária, Mendel, genética humana, antígenos, anticorpos, grupos sanguíneos, transplantes, autoimunidade, câncer, mutações, aconselhamento e diversidade genética.", 20);
add(11403, "Ciências da Natureza", "Biologia", "Seres vivos", "Identidade, classificação e fisiologia", "Níveis de organização, vírus, procariontes, eucariontes, nutrição, ciclos de vida, sistemática, evolução, embriologia, anatomia e fisiologia humana.", 20);
add(11404, "Ciências da Natureza", "Biologia", "Ecologia", "Ecossistemas e ciências ambientais", "Fatores, habitat, nicho, teias, sucessão, populações, interações, ciclos, energia, biogeografia, biomas, recursos, impactos, conservação, saneamento e legislação ambiental.", 20);
add(11405, "Ciências da Natureza", "Biologia", "Evolução", "Origem e evolução da vida", "História e método da Biologia, origem do Universo, Terra e vida, teorias pré-darwinistas, Darwin, síntese evolutiva e seleção artificial.", 20);
add(11406, "Ciências da Natureza", "Biologia", "Saúde", "Qualidade de vida das populações", "Desenvolvimento humano, indicadores, doenças brasileiras, prevenção, primeiros socorros, ISTs, drogas, gravidez, obesidade, violência, exercício, sustentabilidade e cidadania.", "20–21");
add(11407, "Ciências da Natureza", "Biologia", "Biotecnologia", "DNA, clonagem e aplicações biotecnológicas", "DNA recombinante, alimentos, fármacos, investigação, paternidade, identificação, ética, clonagem, células-tronco e sustentabilidade.", 20);

// História, Geografia, Filosofia e Sociologia, cobrindo todos os objetos de Humanas.
add(11501, "Ciências Humanas", "História", "Cultura e diversidade", "Conquista da América e relações coloniais", "Conflitos entre europeus e indígenas, escravidão e resistências indígena e africana na América.", 22);
add(11502, "Ciências Humanas", "História", "História do Brasil", "Povos africanos, indígenas e formação brasileira", "História cultural africana, luta negra, povos indígenas, diversidade cultural, patrimônio e formação sociocultural do Brasil.", 22);
add(11503, "Ciências Humanas", "História", "História política", "Antiguidade, cidadania e democracia", "Cidadania e democracia antigas; Estado, direitos e formas direta, indireta e representativa a partir da modernidade.", 22);
add(11504, "Ciências Humanas", "História", "Idade Moderna", "Revoluções modernas e independências americanas", "Revoluções sociais e políticas europeias e lutas de independência das colônias da América.", 22);
add(11505, "Ciências Humanas", "História", "Brasil Império", "Construção da nação no Brasil imperial", "Grupos sociais em conflito, Estado, cidadania, território, escravidão, abolição e construção nacional.", 22);
add(11506, "Ciências Humanas", "História", "Mundo contemporâneo", "Imperialismo, guerras e Guerra Fria", "Ocupação da Ásia e África, Guerras Mundiais, Guerra Fria e conflitos geopolíticos dos séculos XIX e XX.", 22);
add(11507, "Ciências Humanas", "História", "Revoluções do século XX", "Revoluções Russa, Chinesa e Cubana", "Grupos sociais, projetos políticos e impactos dos grandes processos revolucionários do século XX.", 22);
add(11508, "Ciências Humanas", "História", "Autoritarismo", "Totalitarismos e ditaduras latino-americanas", "Nazifascismo, franquismo, salazarismo, stalinismo, Estado Novo e ditaduras na América Latina.", 23);
add(11509, "Ciências Humanas", "História", "Economia colonial e imperial", "Economia agroexportadora brasileira", "Açúcar, mineração, café e borracha na organização econômica e territorial brasileira.", 23);
add(11510, "Ciências Humanas", "História", "Industrialização", "Revolução Industrial e sistemas de produção", "Sistema fabril, espaço urbano-industrial, fordismo, toyotismo, técnicas produtivas e impactos sociais.", 23);

add(11601, "Ciências Humanas", "Geografia", "Geografia do Brasil", "Formação territorial e regiões brasileiras", "Formação territorial, regionalização e políticas de reordenamento territorial.", 22);
add(11602, "Ciências Humanas", "Geografia", "População", "Migrações, imigrações e emigrações", "Políticas e fluxos populacionais no Brasil nos séculos XIX, XX e XXI.", 22);
add(11603, "Ciências Humanas", "Geografia", "Geopolítica", "Ordem mundial e organismos multilaterais", "Pós-Guerra Fria, conflitos político-culturais, reorganização internacional e organismos multilaterais.", 23);
add(11604, "Ciências Humanas", "Geografia", "Geografia urbana", "Redes, hierarquia e segregação urbana", "Vida urbana, cidades, pobreza, segregação espacial, industrialização, urbanização e transformações sociais.", 23);
add(11605, "Ciências Humanas", "Geografia", "Globalização", "Tecnologias e economia global", "Telecomunicações e consequências econômicas, políticas, culturais e sociais da globalização.", 23);
add(11606, "Ciências Humanas", "Geografia", "Geografia agrária", "Espaço agrário e relações campo-cidade", "Modernização, estruturas tradicionais, agronegócio, agricultura familiar, assalariados, lutas sociais e relação campo-cidade.", 23);
add(11607, "Ciências Humanas", "Geografia", "Recursos naturais", "Sociedade, natureza e impactos econômicos", "Apropriação de recursos, mineração, energia, recursos hídricos, bacias e impactos das atividades econômicas.", 23);
add(11608, "Ciências Humanas", "Geografia", "Questões ambientais", "Mudanças climáticas e ordem ambiental", "Ilhas de calor, efeito estufa, chuva ácida, ozônio, políticas ambientais, conservação, unidades, corredores e zoneamento.", "23–24");
add(11609, "Ciências Humanas", "Geografia", "Geologia e geomorfologia", "Estrutura da Terra, solos e relevo", "Estrutura interna, solos, formas de relevo e agentes internos e externos modeladores.", 24);
add(11610, "Ciências Humanas", "Geografia", "Climatologia", "Atmosfera e climas", "Estrutura e dinâmica atmosférica, classificação climática e características dos climas brasileiros.", 24);
add(11611, "Ciências Humanas", "Geografia", "Biogeografia", "Domínios de vegetação", "Grandes domínios vegetais e relações entre clima, relevo, solos e biodiversidade no Brasil e no mundo.", 24);
add(11612, "Ciências Humanas", "Geografia", "Cartografia", "Representação espacial", "Projeções, escalas, leitura de mapas temáticos, físicos e políticos e tecnologias modernas de cartografia.", 24);

add(11701, "Ciências Humanas", "Filosofia", "Filosofia política", "Estado, cidadania e democracia", "Fundamentos e transformações da cidadania, democracia, direitos e legitimidade do Estado da Antiguidade à modernidade.", 22);
add(11702, "Ciências Humanas", "Filosofia", "Pensamento político", "Liberalismo e seus críticos", "Desenvolvimento do pensamento liberal na sociedade capitalista e críticas dos séculos XIX e XX.", 22);
add(11703, "Ciências Humanas", "Filosofia", "Ética e direitos", "Direitos humanos, justiça e ação política", "Direitos civis, humanos, políticos e sociais, constituições, políticas afirmativas, dilemas éticos e construção de argumentos.", 23);
add(11704, "Ciências Humanas", "Filosofia", "Filosofia ambiental", "Ética ambiental e sustentabilidade", "Relação sociedade-natureza, origem e evolução do conceito de sustentabilidade e avaliação ética de intervenções.", 24);

add(11801, "Ciências Humanas", "Sociologia", "Cultura", "Cultura, patrimônio e identidades", "Cultura material e imaterial, diversidade, movimentos culturais, memória, identidades e patrimônio.", 22);
add(11802, "Ciências Humanas", "Sociologia", "Movimentos sociais", "Organização social e ação coletiva", "Grupos sociais, conflitos, movimentos, participação política, cidadania e conquista de direitos.", "22–23");
add(11803, "Ciências Humanas", "Sociologia", "Trabalho e produção", "Escravismo, feudalismo, capitalismo e socialismo", "Formas históricas de organização da produção, relações de trabalho e experiências econômicas e sociais.", 23);
add(11804, "Ciências Humanas", "Sociologia", "Desigualdades", "Direitos, políticas afirmativas e segregação", "Direitos sociais, desigualdades raciais, econômicas e territoriais, pobreza, políticas públicas e ações afirmativas.", 23);
add(11805, "Ciências Humanas", "Sociologia", "Sociologia rural e urbana", "Relações sociais no campo e na cidade", "Urbanização, segregação, transformações trabalhistas, agronegócio, agricultura familiar, assalariamento e lutas sociais.", 23);

topics.sort((left, right) => left.id - right.id);
fs.writeFileSync(output, `${JSON.stringify(topics, null, 2)}\n`);
console.log(`Plano ENEM 2026 gerado: ${topics.length} tópicos em ${output}`);
