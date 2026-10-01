# -*- coding: utf-8 -*-
"""Datos para el micrositio "Clustering: aplicaciones financieras".

Ejecuta las celdas de código de los cuatro notebooks del curso (Clustering 01 a 04) y guarda en data.es.json lo que las
pestañas necesitan: la base de clientes del banco (para k-means en vivo en el navegador) y los resultados precalculados
de pair trading, perfilamiento (SCF) y carteras (HRP). data.en.json se deriva con data_en.py.

Uso: python3 gen/datos_sitio.py [carpeta_notebooks] [carpeta_datos]
"""
import json, sys, os, numpy as np, pandas as pd, nbformat, warnings
warnings.filterwarnings("ignore")
NB = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/tr/es"
DATOS = sys.argv[2] if len(sys.argv) > 2 else "/home/claude/clu/data"
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "..", "src", "engine", "data.es.json")
os.chdir(DATOS)

def correr(nombre, hasta=None):
    nb = nbformat.read(os.path.join(NB, nombre), as_version=4)
    src = "\n".join(c.source for i, c in enumerate(nb.cells) if c.cell_type == "code" and (hasta is None or i <= hasta))
    src = src.replace("https://raw.githubusercontent.com/daviddiazsolis/clustering_finance_playground/main/notebooks/data/", DATOS.rstrip("/") + "/")
    src = src.replace("fig.show()", "pass").replace("print(", "(lambda *a, **k: None)(")
    ns = {}
    exec(compile(src, nombre, "exec"), ns)
    return ns

r4 = lambda x: round(float(x), 4)
out = {}

# ---------- 1. banco: filas crudas para k-means en vivo ----------
n1 = correr("Clustering_01_Segmentacion_de_Clientes.ipynb", hasta=11)
cl, datos = n1["clientes"], n1["datos"]
OCUP = [c for c in cl["ocupacion"].value_counts().index if c != "Desconocido"]
CIVIL = [c for c in cl["estado_civil"].value_counts().index if c != "Desconocido"]
EDU = ["Sin Educación", "Básica", "Media", "Curso Profesional", "Grado Universitario"]
filas = []
for i in range(len(cl)):
    filas.append([int(cl.loc[i, "edad"]), OCUP.index(cl.loc[i, "ocupacion"]) if cl.loc[i, "ocupacion"] in OCUP else -1,
                  CIVIL.index(cl.loc[i, "estado_civil"]) if cl.loc[i, "estado_civil"] in CIVIL else -1,
                  EDU.index(cl.loc[i, "educacion"]) if cl.loc[i, "educacion"] in EDU else -1,
                  int(datos.loc[i, "cuenta_ahorro"]), int(datos.loc[i, "hipotecario"]), int(datos.loc[i, "credito_consumo"])])
out["banco"] = {"ocupaciones": OCUP, "civil": CIVIL, "educacion": EDU, "columnas": ["edad", "ocupacion", "estado_civil", "educacion", "cuenta_ahorro", "hipotecario", "credito_consumo"],
                "filas": filas, "conteos": {c: cl[c].value_counts().to_dict() for c in ["ocupacion", "estado_civil", "educacion", "cuenta_ahorro", "hipotecario", "credito_consumo", "impago"]},
                "edad": {k: r4(v) for k, v in cl["edad"].describe().items()}}

# ---------- 2. pair trading ----------
n2 = correr("Clustering_02_Pair_Trading.ipynb", hasta=17)
rasgos1, sectores, grupos2, cargas = n2["rasgos1"], n2["sectores"], n2["grupos2"], n2["cargas"]
pares1, candidatos, comparacion, azar, pca = n2["pares1"], n2["candidatos"], n2["comparacion"], n2["azar"], n2["pca"]
precios, busqueda, prueba = n2["precios"], n2["busqueda"], n2["prueba"]
log_precios = np.log(precios)
def series_par(a, b, beta):
    spread = log_precios[a] - beta * log_precios[b]
    s_b = spread.loc[busqueda.index]
    zf = ((spread - s_b.mean()) / s_b.std()).loc[prueba.index]
    zm = ((spread - spread.rolling(60).mean()) / spread.rolling(60).std()).loc[prueba.index]
    r = ((prueba[a].pct_change() - beta * prueba[b].pct_change()) / (1 + beta)).fillna(0)
    return {"a": a, "b": b, "beta": r4(beta), "sa": sectores.get(a), "sb": sectores.get(b), "zf": [round(float(v), 2) for v in zf], "zm": [round(float(v), 2) if np.isfinite(v) else None for v in zm], "r": [round(float(v), 5) for v in r]}
top1 = pares1.head(10); topc = candidatos.head(20)
out["pares"] = {
    "n_acciones": int(precios.shape[1]), "dias_busqueda": int(len(busqueda)), "dias_prueba": int(len(prueba)), "fechas": [d.strftime("%Y-%m-%d") for d in prueba.index],
    "rasgos1": [{"t": t, "ret": r4(r.retorno), "vol": r4(r.volatilidad), "g": int(r.grupo), "s": r.sector} for t, r in rasgos1.iterrows()],
    "var_explicada": [r4(v) for v in pca.explained_variance_ratio_],
    "cp2": {"bajo": [(t, r4(v), sectores.get(t)) for t, v in cargas["CP2"].nsmallest(5).items()], "alto": [(t, r4(v), sectores.get(t)) for t, v in cargas["CP2"].nlargest(5).items()]},
    "tabla_sector": pd.crosstab(grupos2, sectores.reindex(grupos2.index)).to_dict("split"),
    "pruebas1": int(n2["n_pruebas1"]), "encontrados1": int(len(pares1)), "pruebas2": int(n2["n_pruebas2"]), "encontrados2": int(len(n2["pares2"])), "candidatos": int(len(candidatos)),
    "top1": [{"a": r.a, "b": r.b, "p": r4(r.valor_p), "sa": r.sector_a, "sb": r.sector_b} for r in top1.itertuples()],
    "topc": [{"a": r.a, "b": r.b, "p": r4(r.valor_p), "sa": r.sector_a, "sb": r.sector_b, "corr": r4(r.correlacion), "beta": r4(r.beta), "hl": r4(r.vida_media)} for r in topc.itertuples()],
    "comparacion": [{"lista": k[0], "param": k[1], **{c: r4(v) for c, v in row.items()}} for k, row in comparacion.iterrows()],
    "series": [series_par(r.a, r.b, r.beta) for r in topc.itertuples()] + [series_par(r.a, r.b, r.beta) for r in n2["todos1"].head(10).itertuples()],
}

# ---------- 3. SCF ----------
n3 = correr("Clustering_03_Perfilamiento_de_Inversionistas.ipynb", hasta=20)
datos3, perfil, NOMBRES, ORDEN, criterios = n3["datos"], n3["perfil"], n3["NOMBRES"], n3["ORDEN"], n3["criterios"]
comp_sexo, comp_raza = n3["composicion"](datos3, "sexo"), n3["composicion"](datos3, "raza")
dist = pd.concat([n3["dist_sexo"], n3["dist_raza"]])
perf = perfil.copy(); perf.index = [NOMBRES[k] for k in perf.index]; perf = perf.loc[ORDEN]
tabla_pond = n3["tabla"]
muestra = datos3.sample(1200, random_state=1)
from scipy import stats
def cramer(t):
    chi2 = stats.chi2_contingency(t)[0]; n = t.values.sum(); return float(np.sqrt(chi2 / (n * (min(t.shape) - 1))))
out["scf"] = {
    "hogares": int(len(datos3)), "filas": int(len(n3["scf"])), "ponderacion": {v: {c: r4(x) for c, x in row.items()} for v, row in tabla_pond.iterrows()},
    "criterios": {int(k): {"inercia": r4(r.inercia), "silueta": r4(r.silueta)} for k, r in criterios.iterrows()},
    "orden": ORDEN, "perfil": {i: {c: r4(v) for c, v in row.items()} for i, row in perf.iterrows()},
    "comp_sexo": {i: {c: r4(v) for c, v in row.items()} for i, row in comp_sexo.iterrows()}, "comp_raza": {i: {c: r4(v) for c, v in row.items()} for i, row in comp_raza.iterrows()},
    "dist": {i: {c: r4(v) for c, v in row.items()} for i, row in dist.iterrows()},
    "cramer": {"sexo": r4(cramer(pd.crosstab(datos3["perfil"], datos3["sexo"]))), "raza": r4(cramer(pd.crosstab(datos3["perfil"], datos3["raza"])))},
    "nofinrisk_nacional": r4(n3["media_ponderada"](datos3["NOFINRISK"], datos3["WGT"])),
    "muestra": [[int(r.AGE), r4(r.log_NETWORTH), ORDEN.index(r.perfil), r.sexo, r.raza] for r in muestra.itertuples()],
}

# ---------- 4. HRP ----------
n4 = correr("Clustering_04_Hierarchical_Risk_Parity.ipynb", hasta=23)
R, corr, Z_single, orden, etiquetas_ord, pesos = n4["R"], n4["corr"], n4["Z_single"], n4["orden"], n4["etiquetas_ord"], n4["pesos"]
resumen49, carteras49, resumen_etf, carteras_etf, E, contrib = n4["resumen49"], n4["carteras49"], n4["resumen_etf"], n4["carteras_etf"], n4["E"], n4["contrib"]
def curvas(carteras, cada=21):
    acum = (1 + carteras.drop(columns="máximo Sharpe")).cumprod().iloc[::cada]
    return {"fechas": [d.strftime("%Y-%m-%d") for d in acum.index], "series": {c: [r4(v) for v in acum[c]] for c in acum.columns}}
grupos6 = n4["grupos"]
out["hrp"] = {
    "industrias": list(R.columns), "dias": int(len(R)), "desde": str(R.index.min().date()), "hasta": str(R.index.max().date()),
    "vol": {c: r4(v) for c, v in (R.std() * np.sqrt(252)).items()}, "corr_media": r4(corr.values[np.triu_indices(49, 1)].mean()),
    "corr": [[round(float(v), 2) for v in row] for row in corr.values], "orden": [int(i) for i in orden], "linkage": [[r4(v) for v in row] for row in Z_single],
    "grupos6": [int(g) for g in grupos6], "sector": n4["SECTOR"],
    "pesos": {c: {i: r4(v) for i, v in pesos[c].items()} for c in pesos.columns}, "orden_etiquetas": etiquetas_ord,
    "resumen49": {i: {c: r4(v) for c, v in row.items()} for i, row in resumen49.iterrows()}, "curvas49": curvas(carteras49),
    "etf": list(E.columns), "vol_etf": {c: r4(v) for c, v in (E.std() * np.sqrt(252)).items()}, "contrib": {c: {i: r4(v) for i, v in contrib[c].items()} for c in contrib.columns},
    "resumen_etf": {i: {c: r4(v) for c, v in row.items()} for i, row in resumen_etf.iterrows()}, "curvas_etf": curvas(carteras_etf),
    "inestabilidad": {i: {c: r4(v) for c, v in row.items()} for i, row in n4["pd"].DataFrame(n4["filas"]).set_index("regla").iterrows()},
}
json.dump(out, open(SALIDA, "w"), ensure_ascii=False, separators=(",", ":"))
print("ok", os.path.getsize(SALIDA) // 1024, "KB")
