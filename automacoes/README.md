# Categorização de questões da DATAPREV

O arquivo `categorizar-questoes-dataprev.mjs` associa as provas relacionadas
ao concurso DATAPREV 2026 à taxonomia de `study-topics.json`. A prova DATAPREV
2024, que já possui revisão própria, e as provas do ENEM são ignoradas.

## Fluxo para provas novas

1. Adicione a prova ao extrator e ao manifesto `apps/api/prisma/data/exams.json`.
2. Importe a prova e gere seus recortes e JSON:

   ```bash
   npm run source:extract:added
   ```

3. Gere o texto de auditoria, sem sobrescrever os JSONs nem recriar imagens:

   ```bash
   npm run source:audit:added
   ```

4. Faça uma simulação completa das regras:

   ```bash
   npm run source:categorize:dataprev:audit
   ```

5. Revise `relatorio-categorizacao-dataprev.json`. O comando termina com erro
   se existir uma questão sem tópico.
6. Quando o relatório estiver correto, aplique as categorias:

   ```bash
   npm run source:categorize:dataprev
   ```

Por padrão, categorias já preenchidas são preservadas. `--force` recalcula
todas as associações; sem `--apply`, ele funciona apenas como auditoria.

## Critérios do relatório

- `EXISTING`: associação anterior preservada;
- `REVIEWED`: exceção por questão revisada no código;
- `HIGH`: regra semântica direta;
- `MEDIUM`: aproximação necessária porque a taxonomia DATAPREV não possui o
  conteúdo literal da prova de origem;
- `LOW`: fallback amplo por disciplina, que deve ser revisado antes da
  aplicação;
- `UNRESOLVED`: nenhum tópico encontrado; o processo retorna erro.

Ao acrescentar uma regra, prefira o assunto semântico mais específico. Casos
ambíguos devem entrar em `questionOverrides`, identificados por prova e número,
para que a decisão continue determinística e auditável.
