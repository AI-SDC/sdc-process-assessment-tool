# sdc-process-assessment-tool

Simple web-page for Trusted Research Environments to assess their manual output checking processes for compatibility with the statbarnsdc ontology

## Pages

Two self-contained pages (no server needed; all entries stay in the browser):

- `dist/ontology_assessment.html` – map each manual activity to an ontology analysis term and review its linked risks and checks.
- `dist/ontology_assessment_guided.html` – step-by-step walk through each statbarn.

Both are guides for human assessment, not certifications.

## Semantic model

On load, each page fetches the StatBarn SDC ontology (RDF/XML) from
<https://ai-sdc.github.io/statbarnsdc/statbarnsdc.rdf> and derives its lookups in the browser (`src/ontology.js`):

- **statbarns** – subclasses of `Statbarn`, linked to risks by `hasRisk` restrictions;
- **analyses** – subclasses of a statbarn;
- **risks** – subclasses of the DPV `Risk`, linked to checks by `hasRiskEvaluation` restrictions;
- **checks** – subclasses of the DPV `RiskEvaluation`, with their `hasRiskCriteria` shown as "risk criteria".

Pages therefore need network access to that URL when opened, and always reflect the published ontology. To use another copy, change `ONTOLOGY_URL` in `src/ontology.js`.

## Building

```
python build.py
```

This inlines `src/*.js` into the templates and writes the pages to `dist/`. Rebuild after editing anything in `src/`.

## Deployment and feedback

`.github/workflows/pages.yml` builds the pages and publishes them with GitHub Pages on every push to `main`
(enable once under Settings → Pages → Source: **GitHub Actions**). The site is served at
<https://ai-sdc.github.io/sdc-process-assessment-tool/>, with `index.html` linking both pages. `dist/` is generated and not committed.

Each page links to a feedback issue form (`.github/ISSUE_TEMPLATE/feedback.yml`).
