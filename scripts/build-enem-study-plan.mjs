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
add(11208, "Ciências da Natureza", "Física", "Métodos e procedimentos", "Modelos, gráficos e investigação em Física", "Leitura de gráficos e relações matemáticas, mensuração, regularidades, modelos físicos, experimentos e avaliação de procedimentos científicos e tecnológicos.", "17–21");

// Química.
add(11301, "Ciências da Natureza", "Química", "Química geral", "Transformações químicas e estrutura da matéria", "Evidências de transformações, gases, Avogadro, teoria cinética, modelo corpuscular, modelos atômicos, estrutura atômica, isótopos, elementos, tabela periódica e reações.", 18);
add(11302, "Ciências da Natureza", "Química", "Química quantitativa", "Representação e estequiometria", "Fórmulas, balanceamento, leis ponderais, massa, volume, mol, massa molar, constante de Avogadro, rendimento e cálculos estequiométricos.", 18);
add(11303, "Ciências da Natureza", "Química", "Materiais", "Propriedades, ligações e separação de misturas", "Estados e mudanças, misturas e separação, substâncias, metais e ligas, ligações iônica, covalente e metálica, polaridade e forças intermoleculares.", 18);
add(11304, "Ciências da Natureza", "Química", "Soluções", "Água, soluções, ácidos, bases, sais e óxidos", "Solubilidade, concentração, coloides, suspensões, propriedades coligativas, formulação, nomenclatura, indicadores, condutividade e neutralização.", 19);
add(11305, "Ciências da Natureza", "Química", "Físico-química", "Termoquímica, eletroquímica e radioatividade", "Entalpia, calor de reação, Hess, oxirredução, potenciais, pilhas, eletrólise, Faraday, fissão, fusão, desintegração e radioisótopos.", 19);
add(11306, "Ciências da Natureza", "Química", "Cinética química", "Velocidade das transformações", "Velocidade, energia de ativação e efeitos de concentração, pressão, temperatura e catalisador.", 19);
add(11307, "Ciências da Natureza", "Química", "Equilíbrio químico", "Equilíbrio, pH, solubilidade e hidrólise", "Constantes, produto iônico da água, equilíbrio ácido-base, pH, solubilidade, hidrólise, deslocamento do equilíbrio e aplicações cotidianas.", 19);
add(11308, "Ciências da Natureza", "Química", "Química orgânica", "Compostos de carbono e polímeros", "Funções orgânicas, hidrocarbonetos, compostos oxigenados e nitrogenados, fermentação, macromoléculas, polímeros, óleos, gorduras, sabões, proteínas e enzimas.", 19);
add(11309, "Ciências da Natureza", "Química", "Química, tecnologia e ambiente", "Química, tecnologias, sociedade e ambiente", "Química no cotidiano, agricultura, saúde, alimentos, indústria, obtenção de substâncias, mineração, metalurgia, tratamento de água, poluição atmosférica e proteção ambiental.", 19);
add(11310, "Ciências da Natureza", "Química", "Energias químicas", "Energias químicas no cotidiano", "Petróleo, gás natural, carvão, madeira, hulha, biomassa, biocombustíveis, combustíveis fósseis, energia nuclear, lixo atômico, vantagens, desvantagens e impactos ambientais.", 19);
add(11311, "Ciências da Natureza", "Química", "Métodos e procedimentos", "Códigos, modelos e investigação em Química", "Códigos e nomenclatura, linguagem simbólica, gráficos, modelos, experimentos, comparação de materiais e avaliação de processos químicos.", "17–21");

// Biologia.
add(11401, "Ciências da Natureza", "Biologia", "Biologia celular", "Moléculas, células e tecidos", "Membrana, citoplasma, núcleo, divisão, bioquímica, metabolismo, fotossíntese, respiração, informação genética, síntese proteica, diferenciação, tecidos e células-tronco.", 20);
add(11402, "Ciências da Natureza", "Biologia", "Genética", "Hereditariedade e diversidade da vida", "Transmissão hereditária, Mendel, genética humana, antígenos, anticorpos, grupos sanguíneos, transplantes, autoimunidade, câncer, mutações, aconselhamento e diversidade genética.", 20);
add(11403, "Ciências da Natureza", "Biologia", "Seres vivos", "Identidade, classificação e fisiologia", "Níveis de organização, vírus, procariontes, eucariontes, nutrição, ciclos de vida, sistemática, evolução, embriologia, anatomia e fisiologia humana.", 20);
add(11404, "Ciências da Natureza", "Biologia", "Ecologia", "Ecossistemas e ciências ambientais", "Fatores, habitat, nicho, teias, sucessão, populações, interações, ciclos, energia, biogeografia, biomas, recursos, impactos, conservação, saneamento e legislação ambiental.", 20);
add(11405, "Ciências da Natureza", "Biologia", "Evolução", "Origem e evolução da vida", "História e método da Biologia, origem do Universo, Terra e vida, teorias pré-darwinistas, Darwin, síntese evolutiva e seleção artificial.", 20);
add(11406, "Ciências da Natureza", "Biologia", "Saúde", "Qualidade de vida das populações", "Desenvolvimento humano, indicadores, doenças brasileiras, prevenção, primeiros socorros, ISTs, drogas, gravidez, obesidade, violência, exercício, sustentabilidade e cidadania.", "20–21");
add(11407, "Ciências da Natureza", "Biologia", "Biotecnologia", "DNA, clonagem e aplicações biotecnológicas", "DNA recombinante, alimentos, fármacos, investigação, paternidade, identificação, ética, clonagem, células-tronco e sustentabilidade.", 20);
add(11408, "Ciências da Natureza", "Biologia", "Métodos e procedimentos", "Modelos, experimentos e investigação em Biologia", "Interpretação de modelos e experimentos, níveis de organização, procedimentos científicos e avaliação de aplicações biológicas e biotecnológicas.", "17–21");

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
add(11511, "Ciências Humanas", "História", "Fontes e processos históricos", "Fontes, memória e interpretação histórica", "Interpretação e comparação de fontes, temporalidade, memória, patrimônio, processos históricos e diferentes pontos de vista.", "22–25");

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
add(11613, "Ciências Humanas", "Geografia", "Espaço geográfico", "Leitura e interpretação do espaço geográfico", "Paisagem, lugar, território, região, escalas geográficas e interpretação de relações socioespaciais em diferentes fontes.", "22–25");

add(11701, "Ciências Humanas", "Filosofia", "Filosofia política", "Estado, cidadania e democracia", "Fundamentos e transformações da cidadania, democracia, direitos e legitimidade do Estado da Antiguidade à modernidade.", 22);
add(11702, "Ciências Humanas", "Filosofia", "Pensamento político", "Liberalismo e seus críticos", "Desenvolvimento do pensamento liberal na sociedade capitalista e críticas dos séculos XIX e XX.", 22);
add(11703, "Ciências Humanas", "Filosofia", "Ética e direitos", "Direitos humanos, justiça e ação política", "Direitos civis, humanos, políticos e sociais, constituições, políticas afirmativas, dilemas éticos e construção de argumentos.", 23);
add(11704, "Ciências Humanas", "Filosofia", "Filosofia ambiental", "Ética ambiental e sustentabilidade", "Relação sociedade-natureza, origem e evolução do conceito de sustentabilidade e avaliação ética de intervenções.", 24);
add(11705, "Ciências Humanas", "Filosofia", "Métodos e argumentação", "Argumentação e análise filosófica", "Conceitos, problemas, comparação de pontos de vista, validade de argumentos e leitura de textos filosóficos.", "22–25");

add(11801, "Ciências Humanas", "Sociologia", "Cultura", "Cultura, patrimônio e identidades", "Cultura material e imaterial, diversidade, movimentos culturais, memória, identidades e patrimônio.", 22);
add(11802, "Ciências Humanas", "Sociologia", "Movimentos sociais", "Organização social e ação coletiva", "Grupos sociais, conflitos, movimentos, participação política, cidadania e conquista de direitos.", "22–23");
add(11803, "Ciências Humanas", "Sociologia", "Trabalho e produção", "Escravismo, feudalismo, capitalismo e socialismo", "Formas históricas de organização da produção, relações de trabalho e experiências econômicas e sociais.", 23);
add(11804, "Ciências Humanas", "Sociologia", "Desigualdades", "Direitos, políticas afirmativas e segregação", "Direitos sociais, desigualdades raciais, econômicas e territoriais, pobreza, políticas públicas e ações afirmativas.", 23);
add(11805, "Ciências Humanas", "Sociologia", "Sociologia rural e urbana", "Relações sociais no campo e na cidade", "Urbanização, segregação, transformações trabalhistas, agronegócio, agricultura familiar, assalariamento e lutas sociais.", 23);
add(11806, "Ciências Humanas", "Sociologia", "Teoria e análise social", "Teoria social e interpretação da sociedade", "Instituições, grupos, relações sociais, socialização, poder, cultura e interpretação sociológica de diferentes fontes.", "22–25");

// Matemática detalhada: os antigos tópicos 10301–10307 permanecem como
// agrupadores para preservar IDs usados por instalações existentes.
add(11901, "Matemática", "Matemática", "Conhecimentos geométricos", "Figuras planas e espaciais", "Características, composição, decomposição, localização e representação bidimensional e tridimensional de figuras geométricas.", "35–36");
add(11902, "Matemática", "Matemática", "Grandezas e medidas", "Grandezas, unidades de medida e escalas", "Conversões, relações entre grandezas, Sistema Internacional, leitura e aplicação de escalas em situações cotidianas.", "13–14 e 35");
add(11903, "Matemática", "Matemática", "Grandezas e medidas", "Comprimentos, áreas e volumes", "Perímetros, áreas de figuras planas, áreas e volumes de sólidos e avaliação da razoabilidade de medições.", "14 e 35");
add(11904, "Matemática", "Matemática", "Conhecimentos geométricos", "Ângulos, posições de retas e simetrias", "Ângulos, posições relativas de retas e simetrias de figuras planas e espaciais.", "14 e 35");
add(11905, "Matemática", "Matemática", "Conhecimentos geométricos", "Congruência, semelhança e Teorema de Tales", "Congruência e semelhança de triângulos, proporcionalidade geométrica e aplicações do Teorema de Tales.", "14 e 35");
add(11906, "Matemática", "Matemática", "Conhecimentos geométricos", "Relações métricas, circunferência e trigonometria", "Relações métricas nos triângulos, circunferências e trigonometria do ângulo agudo.", "14 e 36");
add(11907, "Matemática", "Matemática", "Estatística", "Representação e análise de dados", "Leitura, comparação e construção de tabelas e gráficos; tendências, inferências, interpolação e extrapolação.", "16 e 36");
add(11908, "Matemática", "Matemática", "Estatística", "Média, moda, mediana, desvios e variância", "Medidas de tendência central e dispersão em dados apresentados diretamente, em tabelas de frequência ou em gráficos.", "16 e 36");
add(11909, "Matemática", "Matemática", "Probabilidade", "Probabilidade e fenômenos aleatórios", "Espaço amostral, princípios de contagem, cálculo de probabilidades e avaliação de fenômenos aleatórios.", "16 e 36");
add(11910, "Matemática", "Matemática", "Conhecimentos algébricos", "Gráficos e funções do 1º e do 2º graus", "Relações entre grandezas, representações algébricas, gráficos cartesianos e funções afins e quadráticas.", "15 e 36");
add(11911, "Matemática", "Matemática", "Conhecimentos algébricos", "Funções polinomiais e racionais", "Modelagem e resolução de problemas com funções polinomiais e racionais.", "15 e 36");
add(11912, "Matemática", "Matemática", "Conhecimentos algébricos", "Funções exponenciais e logarítmicas", "Crescimento, decrescimento, escalas e modelagem com funções exponenciais e logarítmicas.", "15 e 36");
add(11913, "Matemática", "Matemática", "Conhecimentos algébricos", "Ciclo e funções trigonométricas", "Relações no ciclo trigonométrico, periodicidade, gráficos e funções trigonométricas.", "15 e 36");
add(11914, "Matemática", "Matemática", "Conhecimentos algébricos", "Equações e inequações", "Equações, inequações e representações algébricas aplicadas à resolução de situações-problema.", "15 e 36");
add(11915, "Matemática", "Matemática", "Conhecimentos algébricos e geométricos", "Plano cartesiano, retas e circunferências", "Coordenadas, distâncias, equações e interpretação geométrica de retas e circunferências.", "15 e 36");
add(11916, "Matemática", "Matemática", "Conhecimentos algébricos e geométricos", "Paralelismo, perpendicularidade e sistemas", "Posições relativas de retas, sistemas de equações e integração entre representações algébricas e geométricas.", "15 e 36");
add(11917, "Matemática", "Matemática", "Conhecimentos numéricos", "Conjuntos numéricos e operações", "Naturais, inteiros, racionais e reais, operações, representações e avaliação de resultados numéricos.", "13 e 35");
add(11918, "Matemática", "Matemática", "Conhecimentos numéricos", "Desigualdades, divisibilidade e fatoração", "Desigualdades, múltiplos, divisores, critérios de divisibilidade, números primos e fatoração.", "13 e 35");
add(11919, "Matemática", "Matemática", "Variação de grandezas", "Razões, proporções e porcentagem", "Razões, proporções, porcentagens e dependência direta ou inversamente proporcional entre grandezas.", "13 e 15 e 35");
add(11920, "Matemática", "Matemática", "Conhecimentos numéricos", "Sequências, progressões e princípios de contagem", "Padrões numéricos, sequências, progressões aritméticas e geométricas e princípios de contagem.", "13 e 35");
add(11921, "Matemática", "Matemática", "Conhecimentos numéricos", "Matemática financeira", "Juros simples e compostos, taxas, descontos, aumentos, financiamentos e comparação de propostas financeiras.", "13 e 15 e 35");
add(11922, "Matemática", "Matemática", "Modelagem e argumentação", "Resolução, argumentação e intervenção matemática", "Modelagem de situações socioeconômicas ou técnico-científicas, avaliação da razoabilidade de resultados, construção de argumentos e análise de propostas de intervenção.", "13–16");

const metadata = new Map();

function skillRange(prefix, from, to) {
  return Array.from(
    { length: to - from + 1 },
    (_, index) => `${prefix}-H${from + index}`,
  );
}

function assign(
  ids,
  {
    topicCode,
    topicTitle,
    competencyCodes,
    skillCodes = [],
    page,
    isGroup = false,
  },
) {
  ids.forEach((id, index) =>
    metadata.set(id, {
      topicCode,
      topicTitle,
      competencyCodes,
      skillCodes,
      page,
      isGroup,
      sortOrder: index + 1,
    }),
  );
}

// Linguagens: competências de área e habilidades LC-H1 a LC-H30.
assign([10001, 10002], {
  topicCode: "LC-C2",
  topicTitle: "Línguas estrangeiras modernas",
  competencyCodes: ["LC-C2"],
  skillCodes: skillRange("LC", 5, 8),
  page: "9",
});
assign([10003], {
  topicCode: "LC-OC1",
  topicTitle: "Estudo do texto",
  competencyCodes: ["LC-C6", "LC-C7"],
  skillCodes: skillRange("LC", 18, 24),
  page: "11 e 31",
  isGroup: true,
});
assign([11001], {
  topicCode: "LC-OC1",
  topicTitle: "Estudo do texto",
  competencyCodes: ["LC-C6", "LC-C7"],
  skillCodes: skillRange("LC", 18, 24),
  page: "11 e 31",
});
assign([10006], {
  topicCode: "LC-OC2",
  topicTitle: "Estudo das práticas corporais",
  competencyCodes: ["LC-C3"],
  skillCodes: skillRange("LC", 9, 11),
  page: "9 e 31–32",
  isGroup: true,
});
assign([11011, 11012], {
  topicCode: "LC-OC2",
  topicTitle: "Estudo das práticas corporais",
  competencyCodes: ["LC-C3"],
  skillCodes: skillRange("LC", 9, 11),
  page: "9 e 31–32",
});
assign([10005], {
  topicCode: "LC-OC3",
  topicTitle: "Produção e recepção de textos artísticos",
  competencyCodes: ["LC-C4"],
  skillCodes: skillRange("LC", 12, 14),
  page: "10 e 32",
  isGroup: true,
});
assign([11009, 11010], {
  topicCode: "LC-OC3",
  topicTitle: "Produção e recepção de textos artísticos",
  competencyCodes: ["LC-C4"],
  skillCodes: skillRange("LC", 12, 14),
  page: "10 e 32",
});
assign([10004], {
  topicCode: "LC-OC4",
  topicTitle: "Estudo do texto literário",
  competencyCodes: ["LC-C5"],
  skillCodes: skillRange("LC", 15, 17),
  page: "10 e 32–33",
  isGroup: true,
});
assign([11006, 11007, 11008], {
  topicCode: "LC-OC4",
  topicTitle: "Estudo do texto literário",
  competencyCodes: ["LC-C5"],
  skillCodes: skillRange("LC", 15, 17),
  page: "10 e 32–33",
});
assign([10009], {
  topicCode: "LC-OC5",
  topicTitle: "Aspectos linguísticos em diferentes textos",
  competencyCodes: ["LC-C6"],
  skillCodes: skillRange("LC", 18, 20),
  page: "11 e 33",
  isGroup: true,
});
assign([11002, 11004], {
  topicCode: "LC-OC5",
  topicTitle: "Aspectos linguísticos em diferentes textos",
  competencyCodes: ["LC-C6"],
  skillCodes: skillRange("LC", 18, 20),
  page: "11 e 33–34",
});
assign([11003], {
  topicCode: "LC-OC6",
  topicTitle: "Estudo do texto argumentativo",
  competencyCodes: ["LC-C7"],
  skillCodes: skillRange("LC", 21, 24),
  page: "11 e 33",
});
assign([10008], {
  topicCode: "LC-OC7",
  topicTitle: "Usos da língua, norma-padrão e variação",
  competencyCodes: ["LC-C8"],
  skillCodes: skillRange("LC", 25, 27),
  page: "12 e 34",
  isGroup: true,
});
assign([11005], {
  topicCode: "LC-OC7",
  topicTitle: "Usos da língua, norma-padrão e variação",
  competencyCodes: ["LC-C8"],
  skillCodes: skillRange("LC", 25, 27),
  page: "12 e 34",
});
assign([10007], {
  topicCode: "LC-OC8",
  topicTitle: "Tecnologias da comunicação e gêneros digitais",
  competencyCodes: ["LC-C1", "LC-C9"],
  skillCodes: [...skillRange("LC", 1, 4), ...skillRange("LC", 28, 30)],
  page: "8, 12 e 34",
  isGroup: true,
});
assign([11013, 11014], {
  topicCode: "LC-OC8",
  topicTitle: "Tecnologias da comunicação e gêneros digitais",
  competencyCodes: ["LC-C1", "LC-C9"],
  skillCodes: [...skillRange("LC", 1, 4), ...skillRange("LC", 28, 30)],
  page: "8, 12 e 34",
});

// Redação: as cinco competências oficiais e um desdobramento pedagógico.
assign([11015, 11016, 11017, 11018, 11019, 11020], {
  topicCode: "RED",
  topicTitle: "Competências da prova de Redação",
  competencyCodes: ["RED-C1", "RED-C2", "RED-C3", "RED-C4", "RED-C5"],
  page: "27–29",
});
for (let id = 11015; id <= 11019; id += 1) {
  metadata.get(id).competencyCodes = [`RED-C${id - 11014}`];
}

// Ciências da Natureza.
assign([10201, 10202, 10203], {
  topicCode: "CN-AREA",
  topicTitle: "Objetos de conhecimento de Ciências da Natureza",
  competencyCodes: skillRange("CN", 1, 8).map((code) =>
    code.replace("-H", "-C"),
  ),
  skillCodes: skillRange("CN", 1, 30),
  page: "17–21 e 37–50",
  isGroup: true,
});
assign([10204, 11208, 11311, 11408], {
  topicCode: "CN-COMP",
  topicTitle: "Competências interdisciplinares de Ciências da Natureza",
  competencyCodes: ["CN-C1", "CN-C3", "CN-C5"],
  skillCodes: [
    ...skillRange("CN", 1, 4),
    ...skillRange("CN", 8, 12),
    ...skillRange("CN", 17, 19),
  ],
  page: "17–19",
});
assign([11201], {
  topicCode: "CN-FIS1",
  topicTitle: "Conhecimentos básicos e fundamentais de Física",
  competencyCodes: ["CN-C5", "CN-C6"],
  skillCodes: [...skillRange("CN", 17, 20)],
  page: "37",
});
assign([11202], {
  topicCode: "CN-FIS2",
  topicTitle: "Movimento, equilíbrio e leis físicas",
  competencyCodes: ["CN-C6"],
  skillCodes: ["CN-H20"],
  page: "38",
});
assign([11203], {
  topicCode: "CN-FIS3",
  topicTitle: "Energia, trabalho e potência",
  competencyCodes: ["CN-C6"],
  skillCodes: ["CN-H20", "CN-H23"],
  page: "39",
});
assign([11204], {
  topicCode: "CN-FIS4",
  topicTitle: "Mecânica e funcionamento do Universo",
  competencyCodes: ["CN-C1", "CN-C6"],
  skillCodes: ["CN-H3", "CN-H20"],
  page: "39",
});
assign([11205], {
  topicCode: "CN-FIS5",
  topicTitle: "Fenômenos elétricos e magnéticos",
  competencyCodes: ["CN-C2", "CN-C6"],
  skillCodes: ["CN-H5", "CN-H6", "CN-H21", "CN-H23"],
  page: "39–40",
});
assign([11206], {
  topicCode: "CN-FIS6",
  topicTitle: "Oscilações, ondas, óptica e radiação",
  competencyCodes: ["CN-C1", "CN-C6"],
  skillCodes: ["CN-H1", "CN-H22"],
  page: "40–41",
});
assign([11207], {
  topicCode: "CN-FIS7",
  topicTitle: "Calor e fenômenos térmicos",
  competencyCodes: ["CN-C6"],
  skillCodes: ["CN-H21", "CN-H23"],
  page: "41",
});
assign([11301], {
  topicCode: "CN-QUI1",
  topicTitle: "Transformações químicas",
  competencyCodes: ["CN-C7"],
  skillCodes: ["CN-H24", "CN-H25"],
  page: "41–42",
});
assign([11302], {
  topicCode: "CN-QUI2",
  topicTitle: "Representação das transformações químicas",
  competencyCodes: ["CN-C7"],
  skillCodes: ["CN-H24", "CN-H25"],
  page: "42",
});
assign([11303], {
  topicCode: "CN-QUI3",
  topicTitle: "Materiais, suas propriedades e usos",
  competencyCodes: ["CN-C2", "CN-C5", "CN-C7"],
  skillCodes: ["CN-H7", "CN-H18", "CN-H25"],
  page: "42–43",
});
assign([11304], {
  topicCode: "CN-QUI4",
  topicTitle: "Água e soluções",
  competencyCodes: ["CN-C5", "CN-C7"],
  skillCodes: ["CN-H18", "CN-H24", "CN-H25"],
  page: "43–44",
});
assign([11305], {
  topicCode: "CN-QUI5",
  topicTitle: "Transformações químicas e energia",
  competencyCodes: ["CN-C6", "CN-C7"],
  skillCodes: ["CN-H21", "CN-H23", "CN-H26"],
  page: "44",
});
assign([11306], {
  topicCode: "CN-QUI6",
  topicTitle: "Dinâmica das transformações químicas",
  competencyCodes: ["CN-C7"],
  skillCodes: ["CN-H25"],
  page: "44–45",
});
assign([11307], {
  topicCode: "CN-QUI7",
  topicTitle: "Transformação química e equilíbrio",
  competencyCodes: ["CN-C7"],
  skillCodes: ["CN-H24", "CN-H25"],
  page: "45",
});
assign([11308], {
  topicCode: "CN-QUI8",
  topicTitle: "Compostos de carbono",
  competencyCodes: ["CN-C5", "CN-C7"],
  skillCodes: ["CN-H18", "CN-H24", "CN-H25"],
  page: "45",
});
assign([11309], {
  topicCode: "CN-QUI9",
  topicTitle: "Química, tecnologias, sociedade e ambiente",
  competencyCodes: ["CN-C3", "CN-C7"],
  skillCodes: ["CN-H8", "CN-H10", "CN-H12", "CN-H25", "CN-H27"],
  page: "46",
});
assign([11310], {
  topicCode: "CN-QUI10",
  topicTitle: "Energias químicas no cotidiano",
  competencyCodes: ["CN-C3", "CN-C6", "CN-C7"],
  skillCodes: ["CN-H8", "CN-H12", "CN-H23", "CN-H26", "CN-H27"],
  page: "46",
});
assign([11401, 11407], {
  topicCode: "CN-BIO1",
  topicTitle: "Moléculas, células, tecidos e biotecnologia",
  competencyCodes: ["CN-C3", "CN-C4", "CN-C8"],
  skillCodes: ["CN-H11", "CN-H14", "CN-H15", "CN-H29"],
  page: "47",
});
assign([11402], {
  topicCode: "CN-BIO2",
  topicTitle: "Hereditariedade e diversidade da vida",
  competencyCodes: ["CN-C4", "CN-C8"],
  skillCodes: ["CN-H13", "CN-H16", "CN-H29"],
  page: "47–48",
});
assign([11403], {
  topicCode: "CN-BIO3",
  topicTitle: "Identidade dos seres vivos",
  competencyCodes: ["CN-C4", "CN-C8"],
  skillCodes: ["CN-H14", "CN-H15", "CN-H16", "CN-H28"],
  page: "48",
});
assign([11404], {
  topicCode: "CN-BIO4",
  topicTitle: "Ecologia e ciências ambientais",
  competencyCodes: ["CN-C3", "CN-C8"],
  skillCodes: ["CN-H4", "CN-H9", "CN-H10", "CN-H12", "CN-H28"],
  page: "48–49",
});
assign([11405], {
  topicCode: "CN-BIO5",
  topicTitle: "Origem e evolução da vida",
  competencyCodes: ["CN-C1", "CN-C4", "CN-C8"],
  skillCodes: ["CN-H3", "CN-H16", "CN-H28"],
  page: "49",
});
assign([11406], {
  topicCode: "CN-BIO6",
  topicTitle: "Qualidade de vida das populações humanas",
  competencyCodes: ["CN-C4", "CN-C8"],
  skillCodes: ["CN-H14", "CN-H19", "CN-H30"],
  page: "50",
});

// Ciências Humanas: os cinco objetos oficiais do anexo.
assign([10101, 10102, 10103, 10104], {
  topicCode: "CH-AREA",
  topicTitle: "Objetos de conhecimento de Ciências Humanas",
  competencyCodes: skillRange("CH", 1, 6).map((code) =>
    code.replace("-H", "-C"),
  ),
  skillCodes: skillRange("CH", 1, 30),
  page: "22–25 e 51–54",
  isGroup: true,
});
assign([10105, 11511, 11613, 11705, 11806], {
  topicCode: "CH-COMP",
  topicTitle: "Competências interdisciplinares de Ciências Humanas",
  competencyCodes: skillRange("CH", 1, 6).map((code) =>
    code.replace("-H", "-C"),
  ),
  skillCodes: skillRange("CH", 1, 30),
  page: "22–25",
});
assign([11501, 11502, 11801], {
  topicCode: "CH-OC1",
  topicTitle: "Diversidade cultural, conflitos e vida em sociedade",
  competencyCodes: ["CH-C1", "CH-C3"],
  skillCodes: [...skillRange("CH", 1, 5), ...skillRange("CH", 11, 15)],
  page: "51",
});
assign(
  [
    11503, 11504, 11505, 11506, 11507, 11508, 11601, 11602, 11603,
    11604, 11701, 11702, 11703, 11802, 11804,
  ],
  {
    topicCode: "CH-OC2",
    topicTitle:
      "Organização social, movimentos, pensamento político e ação do Estado",
    competencyCodes: ["CH-C2", "CH-C3", "CH-C5"],
    skillCodes: [
      ...skillRange("CH", 6, 15),
      ...skillRange("CH", 21, 25),
    ],
    page: "51–52",
  },
);
assign([11509, 11510, 11605, 11606, 11803, 11805], {
  topicCode: "CH-OC3",
  topicTitle: "Características e transformações das estruturas produtivas",
  competencyCodes: ["CH-C4"],
  skillCodes: skillRange("CH", 16, 20),
  page: "52–53",
});
assign([11607, 11608, 11609, 11610, 11611, 11704], {
  topicCode: "CH-OC4",
  topicTitle: "Domínios naturais e relação do ser humano com o ambiente",
  competencyCodes: ["CH-C6"],
  skillCodes: skillRange("CH", 26, 30),
  page: "53–54",
});
assign([11612], {
  topicCode: "CH-OC5",
  topicTitle: "Representação espacial",
  competencyCodes: ["CH-C2"],
  skillCodes: ["CH-H6"],
  page: "54",
});

// Matemática: sete competências, trinta habilidades e cinco objetos oficiais.
assign([10301, 10302, 10303, 10304, 10305, 10306, 10307], {
  topicCode: "MT-AREA",
  topicTitle: "Objetos de conhecimento de Matemática",
  competencyCodes: skillRange("MT", 1, 7).map((code) =>
    code.replace("-H", "-C"),
  ),
  skillCodes: skillRange("MT", 1, 30),
  page: "13–16 e 35–36",
  isGroup: true,
});
assign([11901, 11904, 11905, 11906], {
  topicCode: "MT-OC2",
  topicTitle: "Conhecimentos geométricos",
  competencyCodes: ["MT-C2"],
  skillCodes: skillRange("MT", 6, 9),
  page: "14 e 35–36",
});
assign([11902, 11903], {
  topicCode: "MT-OC2",
  topicTitle: "Grandezas, medidas e conhecimentos geométricos",
  competencyCodes: ["MT-C3"],
  skillCodes: skillRange("MT", 10, 14),
  page: "14 e 35",
});
assign([11907], {
  topicCode: "MT-OC3",
  topicTitle: "Representação e análise de dados",
  competencyCodes: ["MT-C6"],
  skillCodes: skillRange("MT", 24, 26),
  page: "16 e 36",
});
assign([11908, 11909], {
  topicCode: "MT-OC3",
  topicTitle: "Estatística e probabilidade",
  competencyCodes: ["MT-C7"],
  skillCodes: skillRange("MT", 27, 30),
  page: "16 e 36",
});
assign([11910, 11911, 11912, 11913, 11914], {
  topicCode: "MT-OC4",
  topicTitle: "Conhecimentos algébricos",
  competencyCodes: ["MT-C5"],
  skillCodes: skillRange("MT", 19, 23),
  page: "15 e 36",
});
assign([11915, 11916], {
  topicCode: "MT-OC5",
  topicTitle: "Conhecimentos algébricos e geométricos",
  competencyCodes: ["MT-C5"],
  skillCodes: skillRange("MT", 19, 23),
  page: "15 e 36",
});
assign([11917, 11918, 11920], {
  topicCode: "MT-OC1",
  topicTitle: "Conhecimentos numéricos",
  competencyCodes: ["MT-C1"],
  skillCodes: skillRange("MT", 1, 5),
  page: "13 e 35",
});
assign([11919, 11921], {
  topicCode: "MT-OC1",
  topicTitle: "Conhecimentos numéricos e variação de grandezas",
  competencyCodes: ["MT-C1", "MT-C4"],
  skillCodes: [...skillRange("MT", 1, 5), ...skillRange("MT", 15, 18)],
  page: "13, 15 e 35",
});
assign([11922], {
  topicCode: "MT-COMP",
  topicTitle: "Modelagem, argumentação e intervenção",
  competencyCodes: skillRange("MT", 1, 7).map((code) =>
    code.replace("-H", "-C"),
  ),
  skillCodes: [
    "MT-H3", "MT-H4", "MT-H5", "MT-H8", "MT-H9", "MT-H12", "MT-H13",
    "MT-H14", "MT-H16", "MT-H17", "MT-H18", "MT-H21", "MT-H22", "MT-H23",
    "MT-H25", "MT-H26", "MT-H28", "MT-H29", "MT-H30",
  ],
  page: "13–16",
});

const highPriorityIds = new Set([
  10001, 10002, 10105, 10204, 11001, 11002, 11003, 11004, 11005, 11202,
  11203, 11205, 11207, 11301, 11302, 11304, 11305, 11308, 11309, 11401,
  11402, 11403, 11404, 11406, 11502, 11506, 11510, 11604, 11605, 11606,
  11607, 11608, 11612, 11701, 11703, 11801, 11802, 11803, 11804, 11901,
  11902, 11903, 11905, 11906, 11907, 11908, 11909, 11910, 11912, 11914,
  11917, 11919, 11921, 11922,
]);

for (const topic of topics) {
  const item = metadata.get(topic.id);
  if (!item) {
    throw new Error(`Tópico ENEM ${topic.id} sem metadados da Matriz.`);
  }
  Object.assign(topic, {
    topicCode: item.topicCode,
    topicTitle: item.topicTitle,
    isGroup: item.isGroup,
    competencyCodes: item.competencyCodes,
    skillCodes: item.skillCodes,
    sortOrder: item.sortOrder,
    page: `Matriz de Referência do Enem (Inep, 2026) · p. ${item.page}`,
    suggestedPriority: highPriorityIds.has(topic.id) ? "Alta" : "Média",
  });
}

topics.sort((left, right) => left.id - right.id);
fs.writeFileSync(output, `${JSON.stringify(topics, null, 2)}\n`);
console.log(`Plano ENEM 2026 gerado: ${topics.length} tópicos em ${output}`);
