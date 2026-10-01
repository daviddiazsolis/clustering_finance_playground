# Clustering: Financial Applications

Interactive microsite (English / Spanish, dark / light) with four cases where clustering does real work in finance, in the order of the class: segmenting a bank's 5,660 customers with k-means (computed live in the browser: why one-hot encoding erases the similarity between categories, score mappings on declared business axes that the user can change, elbow and silhouette, segment profiles on those axes, the one-hot comparison and the sensitivity of the segments to the assumptions), pair trading on the S&P 500 (stocks described by return and volatility versus by PCA loadings, cointegration, an honest backtest recomputed live with the user's thresholds and compared against a random control), investor profiling with the Survey of Consumer Finances (weights and implicates, four weighted profiles, and how segments built without sex or race differ by sex and race anyway), and portfolios (a review of Markowitz, the estimation problem, Hierarchical Risk Parity step by step, and why 1/N does almost as well on 49 industries but not on a mixed-asset universe). Part of the ML & AI Learning Hub.

Same stack as the other playgrounds: Vite + React 19 + Tailwind 4 + lucide-react + motion. MathJax is loaded from cdnjs.

## Structure

- `src/components/` shell of the site (hero, translation widget, sandbox and companion-site cards, notebooks, references, footer) in the hub template.
- `src/components/Playground.tsx` mounts the tab engine and re-mounts it when the language changes, keeping tab and step.
- `src/engine/body.<lang>.html` content of the four tabs; `engine.<lang>.js` the live computations: k-means (k-means++, several inits), silhouette, ANOVA and chi-squared on the bank data, and the pair-trading rule on precomputed spreads. The EN engine is token-identical to the ES one except for displayed strings (`node gen/check_en.mjs` verifies it).
- `src/engine/data.<lang>.json` the bank customers (raw rows) and the precomputed results for pair trading, the SCF and HRP. `gen/datos_sitio.py` regenerates `data.es.json` by running the code cells of the four course notebooks (it needs the data files in `notebooks/data/`, plus the SCF and the French 49-industry files, which the notebooks download); `gen/data_en.py` derives `data.en.json` (same numbers, English category labels).
- `gen/test_all.mjs [lang]` runs the engine in jsdom through every tab, step and control.
- `notebooks/` the four Colab notebooks, each in Spanish and English (`_EN`), and `notebooks/data/` the frozen datasets they read (S&P 500 prices and constituents, the ETF prices and the bank customers).

## Run

```
npm install
npm run dev
npm run build
```

## Publish (same flow as the other playgrounds)

1. Create the GitHub repo `daviddiazsolis/clustering_finance_playground` (empty, no README).
2. In this folder: `git init`, `git add .`, `git commit -m "Clustering: financial applications"`, `git branch -M main`, `git remote add origin https://github.com/daviddiazsolis/clustering_finance_playground.git`, `git push -u origin main`.
3. In Vercel: Add New Project, import the repo, framework Vite, deploy. The project name `clustering-finance-playground` gives the URL `https://clustering-finance-playground.vercel.app`, which is the one written in `ml_ai_portal/src/utils/sites.ts` and in `daviddiazsolis-web`. The notebooks read their frozen data from `raw.githubusercontent.com/daviddiazsolis/clustering_finance_playground/main/notebooks/data/`, so the repo must be public.
