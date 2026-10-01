// SPDX-License-Identifier: Apache-2.0
// Motor de las pestañas (vanilla JS). Se monta desde Playground.tsx. Los clientes del banco se agrupan en vivo; pair trading, SCF y HRP vienen precalculados de los notebooks.
export function initEngine(DATA, init) {
let quieto = false;
// ===================== utilidades compartidas =====================
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt2 = x => x.toFixed(2).replace("-", "−").replace(".", ",");
const fmt3 = x => x.toFixed(3).replace("-", "−").replace(".", ",");
const fmt4 = x => x.toFixed(4).replace("-", "−").replace(".", ",");
const pct = x => (100 * x).toFixed(1).replace(".", ",") + "%";
const pct0 = x => Math.round(100 * x) + "%";
const mil = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const el = id => document.getElementById(id);
function stagger(root) { root.querySelectorAll(".stage").forEach((s, i) => { s.style.animationDelay = reduced ? "0s" : (i * 0.18) + "s"; }); }
function stepper(prefix, pasos, onGo) {
  const rail = el(prefix + "-rail");
  rail.innerHTML = pasos.map((p, i) => `<button type="button" data-p="${i}"><span class="n">${i}</span>${p}</button>`).join("");
  rail.querySelectorAll("button").forEach(b => b.onclick = () => onGo(+b.dataset.p));
  el(prefix + "-prev").onclick = () => onGo(-1, -1);
  el(prefix + "-next").onclick = () => onGo(-1, +1);
}
function marcarPaso(prefix, i, n) {
  document.querySelectorAll(`#m-${prefix} .panel`).forEach((p, k) => p.classList.toggle("on", k === i));
  document.querySelectorAll(`#${prefix}-rail button`).forEach((b, k) => k === i ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current"));
  el(prefix + "-prev").disabled = i === 0; el(prefix + "-next").disabled = i === n - 1;
  document.querySelectorAll(`#m-${prefix} > .controls .ctrl[data-pasos]`).forEach(c => { c.style.display = c.dataset.pasos.split(",").map(Number).includes(i) ? "" : "none"; });
  if (!quieto) { const tb = el("tabs"); if (tb) { const y = tb.getBoundingClientRect().top + window.scrollY - 8; window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" }); } }
}
function segmento(id, attr, cb) {
  const e = el(id);
  e.querySelectorAll("button").forEach(b => b.onclick = () => { e.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); cb(b.dataset[attr]); });
}
function pasoGenerico(prefix, n, st, render) {
  return (i, delta) => {
    if (i < 0) i = Math.max(0, Math.min(n - 1, st.paso + delta));
    st.paso = i; marcarPaso(prefix, i, n);
    render(true); tex(document.getElementById("m-" + prefix));
  };
}
function pasoInicial(prefix) { return 0; }
const barras = (items, o = {}) => `<div class="bars">${items.map(it => `<div class="lab ${it.cls || ""}">${it.lab}</div><div class="bar ${it.cls || ""}"><i style="width:${Math.max(0, Math.min(100, 100 * it.v / (o.max || 1)))}%"></i></div><div class="val">${it.txt}</div>`).join("")}</div>`;
const tabla = (cab, filas, cls = "cmp") => `<div class="mwrap"><table class="${cls}"><tr>${cab.map(c => `<th>${c}</th>`).join("")}</tr>${filas.map(r => `<tr class="${r.cls || ""}">${r.c.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
const kpi = items => `<div class="kpi" style="max-width:none">${items.map(it => `<div><div class="t">${it.t}</div><div class="v" ${it.col ? `style="color:${it.col}"` : ""}>${it.v}${it.s ? ` <small>${it.s}</small>` : ""}</div></div>`).join("")}</div>`;
function curva(series, o) {
  const W = o.w || 420, H = o.h || 200, ml = 44, mb = 30, mt = 12, mr = 12;
  const [x0, x1] = o.xr, [y0, y1] = o.yr;
  const X = x => ml + (x - x0) / (x1 - x0) * (W - ml - mr), Y = y => mt + (y1 - y) / (y1 - y0) * (H - mt - mb);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
  const yt = o.yt || [y0, (y0 + y1) / 2, y1], xt = o.xt || [x0, (x0 + x1) / 2, x1];
  yt.forEach(v => s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${ml - 6}" y="${Y(v) + 4}" text-anchor="end" class="tick">${o.yf ? o.yf(v) : v}</text>`);
  xt.forEach(v => s += `<text x="${X(v)}" y="${H - 8}" text-anchor="middle" class="tick">${o.xf ? o.xf(v) : v}</text>`);
  if (o.xl) s += `<text x="${(ml + W - mr) / 2}" y="${H - 20}" text-anchor="middle" class="tick" style="font-weight:600">${o.xl}</text>`;
  series.forEach(se => {
    if (se.pts.length > 1) s += `<polyline points="${se.pts.map(p => X(p[0]) + "," + Y(p[1])).join(" ")}" fill="none" stroke="${se.col}" stroke-width="${se.sw || 2.5}" stroke-linejoin="round" ${se.dash ? 'stroke-dasharray="5 4"' : ""}/>`;
    if (se.marks) se.pts.forEach(p => s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${se.r || 4}" fill="${se.col}"/>`);
    if (se.lab) s += `<text x="${X(se.pts[se.pts.length - 1][0]) - 4}" y="${Y(se.pts[se.pts.length - 1][1]) - 8}" text-anchor="end" style="fill:${se.col};font-size:12px;font-weight:600">${se.lab}</text>`;
  });
  (o.extra || []).forEach(e => { if (e.tipo === "punto") s += `<circle cx="${X(e.x)}" cy="${Y(e.y)}" r="6" fill="var(--cobre)" stroke="var(--surface)" stroke-width="2"/><text x="${X(e.x) + 9}" y="${Y(e.y) - 8}" class="tick" style="fill:var(--cobre);font-weight:600">${e.txt || ""}</text>`; if (e.tipo === "vline") s += `<line x1="${X(e.x)}" x2="${X(e.x)}" y1="${mt}" y2="${H - mb}" stroke="var(--cobre)" stroke-dasharray="4 3"/>`; if (e.tipo === "hline") s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(e.y)}" y2="${Y(e.y)}" stroke="${e.col || "var(--v)"}" stroke-dasharray="4 3"/>`; });
  return s + "</svg>";
}
function histo(vals, o) {
  // histograma simple en SVG
  const [a, b] = o.xr, k = o.k || 15, W = o.w || 420, H = o.h || 180, ml = 36, mb = 28, mt = 10, mr = 10;
  const cnt = Array(k).fill(0); vals.forEach(v => { const i = Math.min(k - 1, Math.max(0, Math.floor((v - a) / (b - a) * k))); cnt[i]++; });
  const mx = Math.max(1, ...cnt); const X = x => ml + (x - a) / (b - a) * (W - ml - mr), Y = c => mt + (1 - c / mx) * (H - mt - mb);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
  cnt.forEach((c, i) => { const x0 = X(a + (b - a) * i / k), x1 = X(a + (b - a) * (i + 1) / k); s += `<rect x="${x0 + 1}" y="${Y(c)}" width="${Math.max(1, x1 - x0 - 2)}" height="${Y(0) - Y(c)}" fill="var(--q)" opacity=".75"/>`; });
  (o.xt || [a, (a + b) / 2, b]).forEach(v => s += `<text x="${X(v)}" y="${H - 8}" text-anchor="middle" class="tick">${o.xf ? o.xf(v) : v}</text>`);
  (o.extra || []).forEach(e => s += `<line x1="${X(e.x)}" x2="${X(e.x)}" y1="${mt}" y2="${H - mb}" stroke="${e.col || "var(--cobre)"}" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(e.x) + 4}" y="${mt + 12}" class="tick" style="fill:${e.col || "var(--cobre)"};font-weight:600">${e.txt || ""}</text>`);
  if (o.xl) s += `<text x="${(ml + W - mr) / 2}" y="${H - 20}" text-anchor="middle" class="tick" style="font-weight:600">${o.xl}</text>`;
  return s + "</svg>";
}
function tex(node) { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(() => { }); }
function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ===================== utilidades propias de este sitio =====================
const PAL = ["var(--q)", "var(--cobre)", "var(--v)", "#a78bfa", "#f472b6", "#94a3b8", "#fb923c", "#22d3ee"];
function scatter(series, o) {
  // nube de puntos (mismo marco que curva); cada serie: { pts: [[x, y]], col, r, lab }
  const W = o.w || 420, H = o.h || 300, ml = 44, mb = 30, mt = 12, mr = 12;
  const [x0, x1] = o.xr, [y0, y1] = o.yr;
  const X = x => ml + (x - x0) / (x1 - x0) * (W - ml - mr), Y = y => mt + (y1 - y) / (y1 - y0) * (H - mt - mb);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
  (o.yt || [y0, (y0 + y1) / 2, y1]).forEach(v => s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${ml - 6}" y="${Y(v) + 4}" text-anchor="end" class="tick">${o.yf ? o.yf(v) : v}</text>`);
  (o.xt || [x0, (x0 + x1) / 2, x1]).forEach(v => s += `<text x="${X(v)}" y="${H - 8}" text-anchor="middle" class="tick">${o.xf ? o.xf(v) : v}</text>`);
  if (o.xl) s += `<text x="${(ml + W - mr) / 2}" y="${H - 20}" text-anchor="middle" class="tick" style="font-weight:600">${o.xl}</text>`;
  if (o.yl) s += `<text x="12" y="${mt + 10}" class="tick" style="font-weight:600">${o.yl}</text>`;
  series.forEach(se => se.pts.forEach(p => s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${se.r || 3}" fill="${se.col}" opacity="${se.op || 0.7}"/>`));
  (o.extra || []).forEach(e => { if (e.tipo === "punto") s += `<rect x="${X(e.x) - 6}" y="${Y(e.y) - 6}" width="12" height="12" fill="${e.col || "var(--ink)"}" stroke="var(--surface)" stroke-width="2"/>`; if (e.tipo === "texto") s += `<text x="${X(e.x) + 8}" y="${Y(e.y) + 4}" class="tick" style="font-size:10px">${e.txt}</text>`; });
  return s + "</svg>";
}
const leyenda = items => `<p style="font-size:.85rem;color:var(--muted);max-width:50ch">${items.map(([lab, col]) => `<span style="color:${col};font-weight:600">${lab}</span>`).join(" · ")}</p>`;
const media = a => a.reduce((s, v) => s + v, 0) / a.length;
const nota = (id, html) => { el(id).innerHTML = html; };

// ===================== pestañas =====================
let modeloActual = "seg";
const GOTO = {};
function irModelo(m) {
  modeloActual = m;
  document.querySelectorAll(".modelo").forEach(e => e.classList.toggle("on", e.id === "m-" + m));
  document.querySelectorAll("#tabs button").forEach(b => b.dataset.m === m ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  GOTO[m](ST[m].paso);
}
document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => irModelo(b.dataset.m));
const ST = { seg: { paso: 0, cols: "mapeo", div: 50, ocu: "base", k: 5, anim: "fin" }, par: { paso: 0, lista: "c", zm: "m", ent: 2, sal: 0.5, stop: 4, par: 0 }, scf: { paso: 0, grp: "raza", col: "perfil" }, hrp: { paso: 0, uni: "49", ord: "arbol" } };

// ===================== 01 SEGMENTACION =====================
(function () {
  const st = ST.seg; const B = DATA.banco; const n = B.filas.length;
  // Todos los textos y los puntajes por categoría (las etiquetas de categoría vienen traducidas en data.en.json) viven en T.
  const T = {
    ing: { "Gerente": 100, "Emprendedor": 75, "Empleado Independiente": 60, "Técnico": 60, "Administrativo": 50, "Servicios": 35, "Obrero": 30, "Jubilado": 30, "Dueña de Casa": 10, "Estudiante": 10, "Desempleado": 0 },
    est: { "Jubilado": 100, "Administrativo": 85, "Gerente": 85, "Técnico": 80, "Obrero": 60, "Servicios": 55, "Empleado Independiente": 40, "Emprendedor": 35, "Dueña de Casa": 30, "Estudiante": 15, "Desempleado": 0 },
    etapa: { "Estudiante": 0, "Desempleado": 30, "Servicios": 35, "Obrero": 45, "Administrativo": 45, "Técnico": 50, "Empleado Independiente": 55, "Dueña de Casa": 55, "Emprendedor": 60, "Gerente": 70, "Jubilado": 100 },
    civ: { "Soltero": 0, "Divorciado": 50, "Casado": 100 },
    jub: "Jubilado", casado: "Casado", divorciado: "Divorciado", soltero: "Soltero", gerente: "Gerente", tecnico: "Técnico", estudiante: "Estudiante", obrero: "Obrero", servicios: "Servicios", desconocido: "Desconocido",
    colEdad: "edad", colIng: "ingreso", colEst: "estabilidad", colEtapa: "etapa de vida", colCiv: "compromiso", colEdu: "educación", colAho: "cuenta de ahorro", colHip: "hipotecario", colCon: "crédito de consumo",
    preOcup: "ocup. ", preCiv: "civil ",
    matNombre: { mapeo: "puntajes de negocio", onehot: "one-hot", num: "solo edad, educación y productos" },
    ocuNombre: { base: "base (ingreso y estabilidad)", jub60: "jubilado con ingreso 60", sinest: "sin eje de estabilidad", etapa: "ingreso y etapa de vida" },
    kClientes: "clientes", kColumnas: "columnas", kColumnasS: "1 numérica, 7 de texto", kEdad: "edad promedio", kEdadS: "de 17 a 92", anios: " años",
    tQueHay: "Qué hay en cada columna de texto", hColumna: "columna", hCategorias: "categorías (clientes)",
    kmInicio: "Inicio: centroides al azar y primera asignación", kmIter: "Iteración ", kmIter2: ": centroides movidos al promedio, nueva asignación",
    kmX: "edad (estandarizada)", kmY: "educación (est.)",
    kmNota: "Un subconjunto de 700 clientes en dos de las columnas estandarizadas, con K = 3. Los cuadrados son los centroides. Después de tres o cuatro vueltas casi nadie cambia de grupo. El Clustering Playground del hub permite hacer esto a mano, punto por punto.",
    tDist: "La distancia entre dos clientes que solo difieren en una categoría", hPar: "par de categorías", hOneHot: "one-hot", hMapeo: "puntajes (eje definido)",
    tMapa: "El mapa de ocupaciones que le entregamos a k-means", mapaX: "ingreso esperado (0 a 100)", mapaY: "estabilidad (0 a 100)",
    mapaNota: "Esta es la segmentación de ocupaciones que hicimos nosotros antes de correr ningún algoritmo: k-means hereda estas cercanías. Si alguien del banco discrepa de un puntaje, este es el momento de discutirlo.",
    tCrudo: "Tres clientes, como vienen", hCliente: "cliente ", hOcup: "ocupación", hCivil: "estado civil", hEdu: "educación", hAho: "ahorro", hHip: "hipotecario", hCon: "consumo",
    tVec: "Los mismos tres, como los ve k-means (", tVec2: " columnas estandarizadas, codificación \"", tVec3: "\")",
    tPesos: "Qué pesa cada variable en la distancia", pesoCol: " columna", pesoCols: " columnas", pesoNo: "no se usa", pesoProd: "3 productos", pesoOcup: "ocupación", pesoCiv: "estado civil",
    pesosNota: "Después de estandarizar, cada columna aporta lo mismo a la distancia. Con puntajes la ocupación son uno o dos ejes con significado; con one-hot son ",
    pesosNota2: " columnas sin relación entre sí, y la variable pesa ", pesosNota3: " veces lo que la edad.",
    tInercia: "Inercia (buscar el codo)", tSilueta: "Silueta (buscar el máximo)", tConv: "La convergencia de k-means (mejor de 12 inicios, K = ", hIter: "iteración", hInercia: "inercia", hCambian: "clientes que cambian de grupo", asigIni: "asignación inicial",
    tAjuste: "Ajuste con K = ", kInercia: "inercia", kSil: "silueta", kIter: "iteraciones", segmentoLab: "segmento ",
    fitNota1: "<b>Lectura.</b> Con la codificación \"", fitNota2: "\" la inercia baja de forma pareja y no hay un codo nítido; la silueta máxima entre 2 y 8 está en K = ",
    fitDebil: "bajo el umbral de 0,25 de estructura débil", fitReal: "estructura débil pero real", fitRazon: "estructura razonable",
    fitNota3: ". Los criterios orientan, no deciden: cinco campañas son operables, quince no. ",
    fitNum: "Con solo las numéricas y los productos la silueta es más alta porque los grupos se forman por tenencia de productos, que es casi binaria.",
    fitOneHot: "Con one-hot la silueta es parecida a la de los puntajes, así que el criterio numérico no avisa del problema: hay que mirar la composición de los segmentos en el paso siguiente.",
    fitMapeo: "Con puntajes la silueta queda cerca de 0,2, lo normal con clientes reales: forman un continuo, no islas.",
    tPerfil: "Perfil de cada segmento (K = ", tPerfil2: ", codificación \"", tPerfil3: "\"; puntajes de 0 a 100 en los ejes definidos, productos en %)",
    hSeg: "segmento", hClientes: "clientes", hPct: "% del total", hEdadProm: "edad",
    tCompOcup: "Composición por ocupación", tCompCiv: "Por estado civil",
    tPruebas: "¿Separan de verdad? (estadísticos; con 5.660 clientes, un F mayor a 5 o un chi-cuadrado mayor a 30 ya es significativo)", hVariable: "variable", hPrueba: "prueba", hEstad: "estadístico", anovaF: "ANOVA F", chi2: "chi-cuadrado",
    tSens: "Sensibilidad: ¿cuánto cambia la segmentación respecto de la base?", sensBase: "puntajes base, divorciado 50, mismo K", hRand: "Rand ajustado contra la base", hMueven: "clientes que cambian de segmento",
    sensNota: "El índice de Rand ajustado vale 1 si las dos particiones coinciden y 0 si coinciden tanto como dos particiones al azar. Mueve el divorciado, cambia el mapeo de ocupación o pasa a one-hot y mira cuánto se mueve.",
    perfNota1: "<b>Lectura.</b> ", perfPuros1: "Hay ", perfPuros2: " segmento definido", perfPuros2p: " segmentos definidos", perfPuros5: " por una sola categoría (", perfPuros6: "el ", perfPuros7: ": ", perfPuros8: "). ",
    perfOneHot: "Es el efecto de codificar a ciegas: one-hot borró la similitud entre ocupaciones y además cada categoría rara, estandarizada, queda lejísimos de todo; a k-means le sale más barato darle un centroide propio. Los segmentos son una tabla de frecuencias, no una segmentación.",
    perfBin: "Lo definió una columna binaria con pocos unos (crédito de consumo): el mismo mecanismo que las dummies. Si el banco quiere que un producto defina un segmento, se deja; si no, se saca de las columnas de segmentar y se usa para describir.",
    perfNinguno: "Ningún segmento es una sola categoría: los grupos cruzan ocupaciones porque les dijimos qué ocupaciones se parecen, y se leen en los ejes que definimos (\"ingreso 63, estabilidad 79\" significa alto en los ejes que nosotros declaramos, no un dato medido). ",
    perfHi: "Las filas resaltadas en la tabla de pruebas son columnas que casi no separan a los segmentos.",
  };
  const NOMC = { edad: T.colEdad, educacion: T.colEdu + " (0 a 100)", cuenta_ahorro: T.colAho, hipotecario: T.colHip, credito_consumo: T.colCon };
  // ---- puntajes vigentes según los supuestos elegidos en los controles
  function puntajes() {
    const civ = Object.assign({}, T.civ); civ[T.divorciado] = st.div;
    const ing = Object.assign({}, T.ing); if (st.ocu === "jub60") ing[T.jub] = 60;
    const seg2 = st.ocu === "sinest" ? null : st.ocu === "etapa" ? T.etapa : T.est;
    return { ing, seg2, civ };
  }
  const mediana = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 50; };
  // ---- matrices: mapeo (puntajes de negocio), onehot (dummies), num (solo numéricas y binarias)
  function matriz(tipo) {
    const P = puntajes(); const no = B.ocupaciones.length, nc = B.civil.length;
    const sc = (dic, nombre) => nombre in dic ? dic[nombre] : null;
    const ingV = B.filas.map(f => f[1] >= 0 ? sc(P.ing, B.ocupaciones[f[1]]) : null), estV = B.filas.map(f => f[1] >= 0 && P.seg2 ? sc(P.seg2, B.ocupaciones[f[1]]) : null), civV = B.filas.map(f => f[2] >= 0 ? sc(P.civ, B.civil[f[2]]) : null);
    const mIng = mediana(ingV.filter(v => v !== null)), mEst = mediana(estV.filter(v => v !== null)), mCiv = mediana(civV.filter(v => v !== null));
    const X = B.filas.map((f, i) => {
      const edu = (f[3] < 0 ? 2 : f[3]) * 25;
      if (tipo === "num") return [f[0], edu, f[4], f[5], f[6]];
      if (tipo === "mapeo") { const r = [f[0], ingV[i] === null ? mIng : ingV[i]]; if (P.seg2) r.push(estV[i] === null ? mEst : estV[i]); return r.concat([civV[i] === null ? mCiv : civV[i], edu, f[4], f[5], f[6]]); }
      const d1 = Array(no).fill(0), d2 = Array(nc).fill(0);
      if (f[1] >= 0) d1[f[1]] = 1; if (f[2] >= 0) d2[f[2]] = 1;
      return [f[0], edu, f[4], f[5], f[6]].concat(d1, d2);
    });
    const base = [T.colEdad, NOMC.educacion, T.colAho, T.colHip, T.colCon];
    const nombres = tipo === "num" ? base : tipo === "mapeo" ? [T.colEdad, T.colIng].concat(P.seg2 ? [st.ocu === "etapa" ? T.colEtapa : T.colEst] : []).concat([T.colCiv, NOMC.educacion, T.colAho, T.colHip, T.colCon]) : base.concat(B.ocupaciones.map(o => T.preOcup + o), B.civil.map(c => T.preCiv + c));
    const p = X[0].length; const mu = Array(p).fill(0), sd = Array(p).fill(0);
    for (let j = 0; j < p; j++) { mu[j] = media(X.map(r => r[j])); sd[j] = Math.sqrt(media(X.map(r => (r[j] - mu[j]) ** 2))) || 1; }
    const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j]));
    return { X, Z, nombres, mu, sd, P, ingV, estV, civV, mIng, mEst, mCiv };
  }
  const CACHE = {};
  const clave = () => st.cols + "|" + (st.cols === "mapeo" ? st.div + "|" + st.ocu : "");
  const mat = () => CACHE[clave()] || (CACHE[clave()] = matriz(st.cols));
  // ---- k-means con k-means++ y varias inicializaciones
  function kmeans(Z, K, seed, maxit = 50) {
    const r = rng32(seed); const p = Z[0].length; const d2 = (a, b) => { let s = 0; for (let j = 0; j < p; j++) { const t = a[j] - b[j]; s += t * t; } return s; };
    let C = [Z[Math.floor(r() * Z.length)].slice()]; let dm = Z.map(z => d2(z, C[0]));
    while (C.length < K) { const tot = dm.reduce((a, b) => a + b, 0); let u = r() * tot, i = 0; while (u > dm[i] && i < Z.length - 1) { u -= dm[i]; i++; } C.push(Z[i].slice()); dm = dm.map((d, q) => Math.min(d, d2(Z[q], C[C.length - 1]))); }
    let lab = Array(Z.length).fill(-1); const hist = [];
    for (let it = 0; it < maxit; it++) {
      let cambios = 0, inercia = 0;
      const nl = Z.map((z, i) => { let b = 0, bd = Infinity; for (let k = 0; k < K; k++) { const d = d2(z, C[k]); if (d < bd) { bd = d; b = k; } } inercia += bd; if (b !== lab[i]) cambios++; return b; });
      lab = nl; hist.push({ it, inercia, cambios });
      if (cambios === 0 && it > 0) break;
      const S = C.map(() => Array(p).fill(0)), cnt = Array(K).fill(0);
      Z.forEach((z, i) => { cnt[lab[i]]++; for (let j = 0; j < p; j++) S[lab[i]][j] += z[j]; });
      C = S.map((s, k) => cnt[k] ? s.map(v => v / cnt[k]) : C[k]);
    }
    return { C, lab, inercia: hist[hist.length - 1].inercia, hist };
  }
  function mejorKmeans(Z, K, inits = 4) { let best = null; for (let s = 1; s <= inits; s++) { const m = kmeans(Z, K, s * 7919 + K); if (!best || m.inercia < best.inercia) best = m; } return best; }
  function silueta(Z, lab, K, muestra = 1200, seed = 3) {
    const r = rng32(seed); const idx = []; for (let i = 0; i < Z.length; i++) if (r() < muestra / Z.length) idx.push(i);
    const p = Z[0].length; const d = (a, b) => { let s = 0; for (let j = 0; j < p; j++) { const t = a[j] - b[j]; s += t * t; } return Math.sqrt(s); };
    let tot = 0, cnt = 0;
    for (const i of idx) {
      const sum = Array(K).fill(0), num = Array(K).fill(0);
      for (const q of idx) { if (q === i) continue; const dd = d(Z[i], Z[q]); sum[lab[q]] += dd; num[lab[q]]++; }
      if (num[lab[i]] === 0) continue;
      const a = sum[lab[i]] / num[lab[i]]; let b = Infinity; for (let k = 0; k < K; k++) if (k !== lab[i] && num[k]) b = Math.min(b, sum[k] / num[k]);
      if (!isFinite(b)) continue; tot += (b - a) / Math.max(a, b); cnt++;
    }
    return tot / cnt;
  }
  // ---- índice de Rand ajustado (Hubert y Arabie, 1985) entre dos particiones
  function randAjustado(a, b) {
    const ka = Math.max(...a) + 1, kb = Math.max(...b) + 1; const M = Array.from({ length: ka }, () => Array(kb).fill(0));
    a.forEach((x, i) => M[x][b[i]]++);
    const c2 = x => x * (x - 1) / 2; let sij = 0, sa = 0, sb = 0;
    M.forEach(row => row.forEach(v => sij += c2(v))); M.forEach(row => sa += c2(row.reduce((s, v) => s + v, 0))); for (let j = 0; j < kb; j++) sb += c2(M.reduce((s, row) => s + row[j], 0));
    const esp = sa * sb / c2(a.length), mx = (sa + sb) / 2; return mx === esp ? 1 : (sij - esp) / (mx - esp);
  }
  const CRIT = {};
  function criterios() { const k = clave(); if (CRIT[k]) return CRIT[k]; const { Z } = mat(); const out = []; for (let K = 2; K <= 8; K++) { const m = mejorKmeans(Z, K, 3); out.push({ K, inercia: m.inercia, silueta: silueta(Z, m.lab, K) }); } return CRIT[k] = out; }
  const FIT = {};
  function ajuste() { const key = clave() + "|" + st.k; if (FIT[key]) return FIT[key]; const { Z } = mat(); const m = mejorKmeans(Z, st.k, 12); m.sil = silueta(Z, m.lab, st.k); return FIT[key] = m; }
  function ajusteBase() { const key = "mapeo|50|base|" + st.k; if (FIT[key]) return FIT[key]; const guardado = { cols: st.cols, div: st.div, ocu: st.ocu }; st.cols = "mapeo"; st.div = 50; st.ocu = "base"; const m = ajuste(); Object.assign(st, guardado); return m; }

  function rDatos(anim) {
    const c = B.conteos; const fila = (nombre, obj) => ({ c: [nombre, Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(", ")] });
    el("seg-datos").innerHTML = kpi([{ t: T.kClientes, v: mil(n) }, { t: T.kColumnas, v: 8, s: T.kColumnasS }, { t: T.kEdad, v: fmt2(B.edad.mean).replace(",00", "") + T.anios, s: T.kEdadS }]) +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">${T.tQueHay}</div>${tabla([T.hColumna, T.hCategorias], ["ocupacion", "estado_civil", "educacion", "cuenta_ahorro", "hipotecario", "credito_consumo", "impago"].map(k => fila(k, c[k])), "cmp small")}</div>`;
    if (anim) stagger(el("seg-s0"));
  }
  function rKm(anim) {
    // demo en dos dimensiones: edad y educación, k-means con K = 3, dibujado paso a paso (3 iteraciones)
    const M = mat(); const je = M.nombres.indexOf(NOMC.educacion); const Z2 = M.Z.map(z => [z[0], z[je]]); const r = rng32(11); const idx = []; for (let i = 0; i < Z2.length; i++) if (r() < 0.12) idx.push(i);
    const sub = idx.map(i => Z2[i]); const pasos = [];
    let C = [sub[3], sub[40], sub[90]].map(c => c.slice());
    for (let it = 0; it < 4; it++) { const lab = sub.map(z => { let b = 0, bd = Infinity; C.forEach((c, k) => { const d = (z[0] - c[0]) ** 2 + (z[1] - c[1]) ** 2; if (d < bd) { bd = d; b = k; } }); return b; }); pasos.push({ C: C.map(c => c.slice()), lab }); const S = [[0, 0], [0, 0], [0, 0]], cnt = [0, 0, 0]; sub.forEach((z, i) => { cnt[lab[i]]++; S[lab[i]][0] += z[0]; S[lab[i]][1] += z[1]; }); C = S.map((s, k) => cnt[k] ? [s[0] / cnt[k], s[1] / cnt[k]] : C[k]); }
    el("seg-km").innerHTML = pasos.map((p, i) => `<div class="block stage"><div class="t">${i === 0 ? T.kmInicio : `${T.kmIter}${i}${T.kmIter2}`}</div>${scatter([0, 1, 2].map(k => ({ pts: sub.filter((z, q) => p.lab[q] === k), col: PAL[k], r: 2.5, op: 0.6 })), { xr: [-2.2, 4.6], yr: [-2.4, 1.8], xt: [-2, 0, 2, 4], yt: [-2, 0, 1.5], xf: fmt2, yf: fmt2, xl: T.kmX, yl: T.kmY, w: 300, h: 240, extra: p.C.map((c, k) => ({ tipo: "punto", x: c[0], y: c[1], col: PAL[k] })) })}</div>`).join("") +
      `<p style="font-size:.85rem;color:var(--muted);max-width:60ch">${T.kmNota}</p>`;
    if (anim) stagger(el("seg-s1"));
  }
  function rPre(anim) {
    const M = mat(); const p = M.nombres.length; const P = M.P;
    // 1) distancias entre categorías con una y otra codificación
    const dOne = (a, b) => a === b ? 0 : Math.SQRT2;
    const dMap = (a, b) => Math.hypot(P.ing[a] - P.ing[b], P.seg2 ? P.seg2[a] - P.seg2[b] : 0);
    const paresCiv = [[T.casado, T.divorciado], [T.casado, T.soltero], [T.divorciado, T.soltero]];
    const paresOcu = [[T.gerente, T.tecnico], [T.gerente, T.estudiante], [T.obrero, T.servicios], [T.jub, T.estudiante], [T.jub, T.obrero]];
    const dist = tabla([T.hPar, T.hOneHot, T.hMapeo], paresCiv.map(([a, b]) => ({ c: [`${a} / ${b}`, fmt2(dOne(a, b)), String(Math.abs(P.civ[a] - P.civ[b]))] })).concat(paresOcu.map(([a, b]) => ({ c: [`${a} / ${b}`, fmt2(dOne(a, b)), fmt2(dMap(a, b)).replace(",00", "")] }))), "cmp small");
    // 2) mapa de ocupaciones (ingreso x segundo eje)
    const ocs = B.ocupaciones.filter(o => o in P.ing); const cnt = B.conteos.ocupacion;
    const mapa = P.seg2 ? scatter([{ pts: ocs.map(o => [P.ing[o], P.seg2[o]]), col: "var(--cobre)", r: 6, op: 0.85 }], { xr: [-8, 140], yr: [-10, 112], xt: [0, 50, 100], yt: [0, 50, 100], xf: String, yf: String, xl: T.mapaX, yl: st.ocu === "etapa" ? T.colEtapa : T.mapaY, w: 420, h: 300, extra: ocs.map(o => ({ tipo: "texto", x: P.ing[o], y: P.seg2[o], txt: `${o} (${mil(cnt[o] || 0)})` })) }) : barras(ocs.slice().sort((a, b) => P.ing[b] - P.ing[a]).map(o => ({ lab: o, v: P.ing[o], txt: String(P.ing[o]) })), { max: 100 });
    // 3) tres clientes como vectores
    const ejemplo = [0, 1, 7].map(i => B.filas[i]);
    const crudo = tabla(["", T.colEdad, T.hOcup, T.hCivil, T.hEdu, T.hAho, T.hHip, T.hCon], ejemplo.map((f, q) => ({ c: [T.hCliente + (q + 1), f[0], f[1] >= 0 ? B.ocupaciones[f[1]] : T.desconocido, f[2] >= 0 ? B.civil[f[2]] : T.desconocido, f[3] >= 0 ? B.educacion[f[3]] : T.desconocido, f[4], f[5], f[6]] })), "cmp small");
    const cols = M.nombres.slice(0, Math.min(p, 9));
    const vec = tabla([""].concat(cols).concat(p > 9 ? ["..."] : []), ejemplo.map((f, q) => ({ c: [T.hCliente + (q + 1)].concat(cols.map((c, j) => fmt2(M.Z[[0, 1, 7][q]][j]))).concat(p > 9 ? ["..."] : []) })), "cmp small");
    const no = B.ocupaciones.length, nc = B.civil.length;
    const pesoO = st.cols === "num" ? 0 : st.cols === "onehot" ? no : P.seg2 ? 2 : 1, pesoC = st.cols === "num" ? 0 : st.cols === "onehot" ? nc : 1;
    el("seg-pre").innerHTML = (st.cols === "mapeo" ? `<div class="block stage"><div class="t">${T.tDist}</div>${dist}</div><div class="block stage"><div class="t">${T.tMapa}</div>${mapa}<p style="font-size:.85rem;color:var(--muted);max-width:44ch">${T.mapaNota}</p></div>` : "") +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">${T.tCrudo}</div>${crudo}</div>` +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">${T.tVec}${p}${T.tVec2}${T.matNombre[st.cols]}${T.tVec3}</div>${vec}</div>` +
      `<div class="block stage"><div class="t">${T.tPesos}</div>${barras([{ lab: T.colEdad, v: 1, txt: "1" + T.pesoCol }, { lab: T.colEdu, v: 1, txt: "1" + T.pesoCol }, { lab: T.pesoProd, v: 3, txt: "3" + T.pesoCols }, { lab: T.pesoOcup, v: pesoO, txt: pesoO === 0 ? T.pesoNo : pesoO === 1 ? "1" + T.pesoCol : pesoO + T.pesoCols, cls: "pred" }, { lab: T.pesoCiv, v: pesoC, txt: pesoC === 0 ? T.pesoNo : pesoC === 1 ? "1" + T.pesoCol : pesoC + T.pesoCols, cls: "pred" }], { max: no })}<p style="font-size:.85rem;color:var(--muted);max-width:40ch">${T.pesosNota}${no}${T.pesosNota2}${no}${T.pesosNota3}</p></div>`;
    if (anim) stagger(el("seg-s2"));
  }
  function rFit(anim) {
    const cr = criterios(); const m = ajuste();
    const ks = cr.map(c => c.K); const imax = Math.max(...cr.map(c => c.inercia)); const smax = Math.max(0.45, ...cr.map(c => c.silueta));
    let html = `<div class="block stage"><div class="t">${T.tInercia}</div>${curva([{ pts: cr.map(c => [c.K, c.inercia]), col: "var(--q)", marks: true }], { xr: [2, 8], yr: [0, imax * 1.05], xt: ks, yt: [0, imax / 2, imax], xf: v => String(v), yf: v => mil(Math.round(v)), xl: "K", w: 360, h: 230, extra: [{ tipo: "vline", x: st.k }] })}</div>` +
      `<div class="block stage"><div class="t">${T.tSilueta}</div>${curva([{ pts: cr.map(c => [c.K, c.silueta]), col: "var(--cobre)", marks: true }], { xr: [2, 8], yr: [0, smax], xt: ks, yt: [0, 0.25, smax], xf: v => String(v), yf: fmt2, xl: "K", w: 360, h: 230, extra: [{ tipo: "vline", x: st.k }, { tipo: "hline", y: 0.25, col: "var(--muted)" }] })}</div>`;
    if (st.anim === "paso") {
      const h = m.hist; const im = h[0].inercia;
      html += `<div class="block stage"><div class="t">${T.tConv}${st.k})</div>${curva([{ pts: h.map(x => [x.it, x.inercia]), col: "var(--q)", marks: true }], { xr: [0, Math.max(5, h.length - 1)], yr: [h[h.length - 1].inercia * 0.95, im * 1.02], xt: [0, Math.floor((h.length - 1) / 2), h.length - 1], yt: [h[h.length - 1].inercia, im], xf: v => String(v), yf: v => mil(Math.round(v)), xl: T.hIter, w: 360, h: 220 })}${tabla([T.hIter, T.hInercia, T.hCambian], h.map(x => ({ c: [x.it, mil(Math.round(x.inercia)), x.it === 0 ? T.asigIni : mil(x.cambios)] })), "cmp small")}</div>`;
    }
    const cnt = Array(st.k).fill(0); m.lab.forEach(l => cnt[l]++);
    html += `<div class="block stage"><div class="t">${T.tAjuste}${st.k}</div>${kpi([{ t: T.kInercia, v: mil(Math.round(m.inercia)) }, { t: T.kSil, v: fmt3(m.sil), col: "var(--cobre)" }, { t: T.kIter, v: m.hist.length }])}${barras(cnt.map((v, k) => ({ lab: T.segmentoLab + k, v, txt: mil(v) })), { max: Math.max(...cnt) })}</div>`;
    el("seg-fit").innerHTML = html;
    const best = cr.reduce((a, b) => b.silueta > a.silueta ? b : a);
    nota("seg-fit-nota", `${T.fitNota1}${T.matNombre[st.cols]}${T.fitNota2}${best.K} (${fmt3(best.silueta)}), ${best.silueta < 0.25 ? T.fitDebil : best.silueta < 0.5 ? T.fitReal : T.fitRazon}${T.fitNota3}${st.cols === "num" ? T.fitNum : st.cols === "onehot" ? T.fitOneHot : T.fitMapeo}`);
    if (anim) stagger(el("seg-s3"));
  }
  function rPerf(anim) {
    const m = ajuste(); const K = st.k; const F = B.filas; const M = mat(); const P = M.P;
    const grupos = Array.from({ length: K }, (_, k) => F.map((f, i) => i).filter(i => m.lab[i] === k));
    const prom = (idx, j) => media(idx.map(i => F[i][j]));
    const pIng = i => M.ingV[i] === null ? M.mIng : M.ingV[i], pEst = i => M.estV[i] === null ? M.mEst : M.estV[i], pCiv = i => M.civV[i] === null ? M.mCiv : M.civV[i];
    const r0 = x => String(Math.round(x));
    const filas = grupos.map((g, k) => ({ c: [k, mil(g.length), pct0(g.length / n), r0(prom(g, 0)), r0(media(g.map(pIng)))].concat(P.seg2 ? [r0(media(g.map(pEst)))] : []).concat([r0(media(g.map(pCiv))), r0(media(g.map(i => (F[i][3] < 0 ? 2 : F[i][3]) * 25))), pct0(prom(g, 4)), pct0(prom(g, 5)), pct0(prom(g, 6))]) }));
    const comp = (j, cats) => tabla([T.hSeg].concat(cats), grupos.map((g, k) => ({ c: [k].concat(cats.map((c, q) => pct0(g.filter(i => F[i][j] === q).length / g.length))) })), "cmp small");
    // pruebas: ANOVA (F) para numéricas, chi-cuadrado para categóricas
    const anovaV = vals => { const tot = media(vals); let sb = 0, sw = 0; grupos.forEach(g => { const mg = media(g.map(i => vals[i])); sb += g.length * (mg - tot) ** 2; g.forEach(i => sw += (vals[i] - mg) ** 2); }); return (sb / (K - 1)) / (sw / (n - K)); };
    const anova = j => anovaV(F.map(f => f[j]));
    const chi2 = (j, nc) => { let s = 0; const colt = Array(nc).fill(0); F.forEach(f => { if (f[j] >= 0) colt[f[j]]++; }); const N = colt.reduce((a, b) => a + b, 0); grupos.forEach(g => { const ng = g.filter(i => F[i][j] >= 0).length; for (let c = 0; c < nc; c++) { const o = g.filter(i => F[i][j] === c).length, e = ng * colt[c] / N; if (e > 0) s += (o - e) ** 2 / e; } }); return s; };
    const pruebas = [[T.colEdad, T.anovaF, anova(0)], [T.colIng, T.anovaF, anovaV(F.map((f, i) => pIng(i)))], [T.colCiv, T.anovaF, anovaV(F.map((f, i) => pCiv(i)))], [T.colAho, T.anovaF, anova(4)], [T.colHip, T.anovaF, anova(5)], [T.colCon, T.anovaF, anova(6)], [T.hOcup, T.chi2, chi2(1, B.ocupaciones.length)], [T.hCivil, T.chi2, chi2(2, B.civil.length)], [T.hEdu, T.chi2, chi2(3, B.educacion.length)]];
    // sensibilidad: Rand ajustado contra la segmentación base (puntajes base, divorciado 50, mismo K)
    const mb = ajusteBase(); const esBase = st.cols === "mapeo" && st.div === 50 && st.ocu === "base";
    const ari = esBase ? 1 : randAjustado(mb.lab, m.lab);
    const cambian = (() => { if (esBase) return 0; const M = Array.from({ length: K }, () => Array(K).fill(0)); mb.lab.forEach((x, i) => M[x][m.lab[i]]++); const ua = new Set(), ub = new Set(); let ok = 0; for (let t = 0; t < K; t++) { let bv = -1, bi = 0, bj = 0; for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) if (!ua.has(i) && !ub.has(j) && M[i][j] > bv) { bv = M[i][j]; bi = i; bj = j; } ua.add(bi); ub.add(bj); ok += bv; } return 1 - ok / n; })();
    const cab = [T.hSeg, T.hClientes, T.hPct, T.hEdadProm, T.colIng].concat(P.seg2 ? [st.ocu === "etapa" ? T.colEtapa : T.colEst] : []).concat([T.colCiv, NOMC.educacion, T.colAho, T.colHip, T.colCon]);
    el("seg-perf").innerHTML = `<div class="block stage" style="flex:1 1 100%"><div class="t">${T.tPerfil}${K}${T.tPerfil2}${T.matNombre[st.cols]}${T.tPerfil3}</div>${tabla(cab, filas, "cmp small")}</div>` +
      `<div class="block stage"><div class="t">${T.tCompOcup}</div>${comp(1, B.ocupaciones)}</div><div class="block stage"><div class="t">${T.tCompCiv}</div>${comp(2, B.civil)}</div>` +
      `<div class="block stage"><div class="t">${T.tPruebas}</div>${tabla([T.hVariable, T.hPrueba, T.hEstad], pruebas.map(p => ({ c: [p[0], p[1], p[2] > 9999 ? mil(Math.round(p[2])) : fmt2(p[2])], cls: (p[1] === T.anovaF && p[2] < 5) || (p[1] !== T.anovaF && p[2] < 30) ? "hi" : "" })), "cmp small")}</div>` +
      `<div class="block stage"><div class="t">${T.tSens}</div>${kpi([{ t: T.hRand, v: fmt3(ari), col: "var(--cobre)", s: T.sensBase }, { t: T.hMueven, v: pct0(cambian) }])}<p style="font-size:.85rem;color:var(--muted);max-width:44ch">${T.sensNota}</p></div>`;
    const puros = grupos.map((g, k) => { let best = 0, bc = -1; for (let c = 0; c < B.ocupaciones.length; c++) { const f = g.filter(i => F[i][1] === c).length / g.length; if (f > best) { best = f; bc = c; } } let bc2 = -1, best2 = 0; for (let c = 0; c < B.civil.length; c++) { const f = g.filter(i => F[i][2] === c).length / g.length; if (f > best2) { best2 = f; bc2 = c; } } const con = prom(g, 6); return { k, best, bc, best2, bc2, con }; }).filter(x => x.best > 0.85 || (st.cols === "onehot" && x.best2 > 0.95));
    const binarios = grupos.map((g, k) => ({ k, con: prom(g, 6) })).filter(x => x.con > 0.97);
    nota("seg-perf-nota", `${T.perfNota1}${puros.length ? `${T.perfPuros1}${puros.length}${puros.length > 1 ? T.perfPuros2p : T.perfPuros2}${T.perfPuros5}${puros.map(x => x.best > 0.85 ? `${T.perfPuros6}${x.k}${T.perfPuros7}${pct0(x.best)} ${B.ocupaciones[x.bc]}` : `${T.perfPuros6}${x.k}${T.perfPuros7}${pct0(x.best2)} ${B.civil[x.bc2]}`).join("; ")}${T.perfPuros8}${st.cols === "onehot" ? T.perfOneHot : ""} ` : T.perfNinguno}${binarios.length ? `${T.perfPuros6}${binarios.map(x => x.k).join(", ")}${T.perfPuros7}${T.perfBin} ` : ""}${T.perfHi}`);
    if (anim) stagger(el("seg-s4"));
  }
  segmento("seg-cols", "c", c => { st.cols = c; document.querySelectorAll("#m-seg .ctrl[data-mapeo]").forEach(x => x.style.display = c === "mapeo" ? "" : "none"); if (st.paso >= 1) render(false); });
  el("seg-div").oninput = e => { st.div = +e.target.value; el("seg-div-v").textContent = String(st.div); if (st.paso >= 1) render(false); };
  segmento("seg-ocu", "o", o => { st.ocu = o; if (st.paso >= 1) render(false); });
  el("seg-k").oninput = e => { st.k = +e.target.value; el("seg-k-v").textContent = String(st.k); if (st.paso >= 3) render(false); };
  segmento("seg-anim", "a", a => { st.anim = a; if (st.paso === 3) rFit(false); });
  function render(anim) { if (st.cols !== "mapeo") document.querySelectorAll("#m-seg .ctrl[data-mapeo]").forEach(x => x.style.display = "none"); [rDatos, rKm, rPre, rFit, rPerf][st.paso](anim); }
  el("seg-replay").onclick = () => render(true);
  GOTO.seg = pasoGenerico("seg", 5, st, render);
  stepper("seg", ["Los datos", "Qué hace k-means", "Codificar con lógica de negocio", "Cuántos grupos", "Interpretar y sensibilidad"], GOTO.seg);
})();

// ===================== 02 PAIR TRADING =====================
(function () {
  const st = ST.par; const P = DATA.pares;
  const NML = { "retorno y volatilidad: 20 de menor valor p": "retorno y volatilidad: 20 de menor valor p", "retorno y volatilidad: todos los pares": "retorno y volatilidad: todos los pares", "co-movimiento: 20 de reversión más rápida": "co-movimiento: 20 de reversión más rápida", "co-movimiento: todos los pares": "co-movimiento: todos los pares", "pares al azar (control)": "pares al azar (control)", "parámetros fijos": "parámetros fijos", "ventana móvil de 60 días": "ventana móvil de 60 días" };
  function rDatos(anim) {
    el("par-datos").innerHTML = kpi([{ t: "acciones con historia completa", v: P.n_acciones }, { t: "pares posibles", v: mil(P.n_acciones * (P.n_acciones - 1) / 2) }, { t: "falsos positivos esperados al 5%", v: mil(Math.round(P.n_acciones * (P.n_acciones - 1) / 2 * 0.05)), col: "var(--bad)" }, { t: "búsqueda", v: mil(P.dias_busqueda) + " días", s: "2021 a 2023" }, { t: "prueba", v: mil(P.dias_prueba) + " días", s: "2024 y 2025" }]);
    if (anim) stagger(el("par-s0"));
  }
  function rV1(anim) {
    const G = [...new Set(P.rasgos1.map(r => r.g))];
    const series = G.map(g => ({ pts: P.rasgos1.filter(r => r.g === g).map(r => [r.vol, r.ret]), col: PAL[g % PAL.length], r: 3, op: 0.75 }));
    el("par-v1").innerHTML = `<div class="block stage"><div class="t">Las ${P.n_acciones} acciones por volatilidad y retorno (2021 a 2023), ${G.length} grupos de k-means</div>${scatter(series, { xr: [0.1, 0.8], yr: [-0.5, 0.9], xt: [0.2, 0.4, 0.6, 0.8], yt: [-0.5, 0, 0.5], xf: pct0, yf: pct0, xl: "volatilidad anual", yl: "retorno anual", w: 460, h: 340 })}</div>` +
      `<div class="block stage"><div class="t">Cointegración dentro de esos grupos</div>${kpi([{ t: "pruebas", v: mil(P.pruebas1) }, { t: "pares con p < 0,05", v: P.encontrados1 }, { t: "fracción", v: pct(P.encontrados1 / P.pruebas1), col: "var(--bad)", s: "por azar: 5%" }])}${tabla(["par", "sector de A", "sector de B", "valor p"], P.top1.map(r => ({ c: [`${r.a} y ${r.b}`, r.sa, r.sb, r.p < 0.001 ? "< 0,001" : fmt3(r.p)] })), "cmp small")}<p style="font-size:.85rem;color:var(--muted);max-width:44ch">Una tienda de electrónica con una administradora de fondos, un gasoducto con un fabricante de armas: pares sin relación económica, con valores p impecables.</p></div>`;
    if (anim) stagger(el("par-s1"));
  }
  function rV2(anim) {
    const T = P.tabla_sector; const sect = T.columns, grupos = T.index;
    const filas = grupos.map((g, i) => { const row = T.data[i]; const tot = row.reduce((a, b) => a + b, 0); const mx = Math.max(...row); return { c: [g].concat(row.map(v => v ? v : "")).concat([tot]), cls: mx / tot > 0.8 ? "hi" : "" }; });
    el("par-v2").innerHTML = `<div class="block stage"><div class="t">Varianza explicada por las diez componentes</div>${barras(P.var_explicada.map((v, i) => ({ lab: "CP" + (i + 1), v, txt: pct(v) })), { max: P.var_explicada[0] })}<p style="font-size:.85rem;color:var(--muted);max-width:40ch">La primera es el mercado (todas las cargas del mismo signo). La segunda contrasta ${P.cp2.bajo.map(x => x[0]).join(", ")} (${P.cp2.bajo[0][2]}) con ${P.cp2.alto.map(x => x[0]).join(", ")} (${P.cp2.alto[0][2]}).</p></div>` +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">Acciones de cada sector en cada grupo (filas resaltadas: más del 80% de un solo sector)</div>${tabla(["grupo"].concat(sect.map(s => s.replace("Information Technology", "Tecnología").replace("Communication Services", "Comunicaciones").replace("Consumer Discretionary", "Cons. discrecional").replace("Consumer Staples", "Cons. básico").replace("Health Care", "Salud").replace("Financials", "Financiero").replace("Industrials", "Industrial").replace("Real Estate", "Real estate").replace("Materials", "Materiales").replace("Utilities", "Utilities").replace("Energy", "Energía"))).concat(["total"]), filas, "cmp small")}</div>` +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">Pares dentro de los grupos, con filtros: ${mil(P.pruebas2)} pruebas, ${P.encontrados2} cointegrados, ${P.candidatos} pasan correlación, beta y vida media</div>${tabla(["par", "sector", "valor p", "correlación", "beta", "vida media (días)"], P.topc.slice(0, 10).map(r => ({ c: [`${r.a} y ${r.b}`, r.sa === r.sb ? r.sa : r.sa + " / " + r.sb, r.p < 0.001 ? "< 0,001" : fmt3(r.p), fmt2(r.corr), fmt2(r.beta), fmt2(r.hl).slice(0, -3) || fmt2(r.hl)] })), "cmp small")}</div>`;
    if (anim) stagger(el("par-s2"));
  }
  function operar(s) {
    const z = st.zm === "m" ? s.zm : s.zf; const pos = []; let cur = 0, prev = 0;
    for (let i = 0; i < z.length; i++) { const v = z[i]; if (v === null) { pos.push(0); continue; } if (cur === 0 && v > st.ent && prev <= st.ent) cur = -1; else if (cur === 0 && v < -st.ent && prev >= -st.ent) cur = 1; else if (cur !== 0 && (Math.abs(v) < st.sal || Math.abs(v) > st.stop)) cur = 0; pos.push(cur); prev = v; }
    const ret = s.r.map((r, i) => i > 0 ? pos[i - 1] * r : 0); let ops = 0; for (let i = 1; i < pos.length; i++) if (pos[i] !== pos[i - 1]) ops++;
    return { pos, ret, ops, z };
  }
  function rBt(anim) {
    const lista = st.lista === "c" ? P.series.slice(0, 20) : P.series.slice(20);
    const res = lista.map(s => { const o = operar(s); const tot = o.ret.reduce((a, r) => a * (1 + r), 1) - 1; return { s, o, tot }; });
    const cart = res[0].o.ret.map((_, i) => media(res.map(r => r.o.ret[i])));
    const acum = []; let c = 1; cart.forEach(r => { c *= 1 + r; acum.push(c); });
    const sd = Math.sqrt(media(cart.map(r => (r - media(cart)) ** 2))); const sharpe = media(cart) / sd * Math.sqrt(252);
    st.par = Math.min(st.par, lista.length - 1); const sel = res[st.par]; el("par-par-v").textContent = `${sel.s.a} y ${sel.s.b}`;
    el("par-par").max = String(lista.length - 1);
    const z = sel.o.z.map((v, i) => v === null ? null : v); const zs = z.map((v, i) => [i, v]).filter(p => p[1] !== null);
    const zmax = Math.max(st.stop + 0.5, ...zs.map(p => Math.abs(p[1])));
    const posPts = sel.o.pos.map((p, i) => [i, p * (zmax * 0.6)]);
    const t = P.fechas; const xt = [0, Math.floor(t.length / 2), t.length - 1];
    el("par-bt").innerHTML = `<div class="block stage" style="flex:1 1 100%"><div class="t">${lista.length} pares (${st.lista === "c" ? "co-movimiento con filtros, los 20 de reversión más rápida" : "retorno y volatilidad, los 10 de menor valor p"}), z-score con ${st.zm === "m" ? "ventana móvil de 60 días" : "parámetros fijos"}, entrada ${fmt2(st.ent).slice(0, 3)}, salida ${fmt2(st.sal).slice(0, 3)}, stop ${fmt2(st.stop).slice(0, 3)}</div>${kpi([{ t: "pares positivos", v: pct0(res.filter(r => r.tot > 0).length / res.length) }, { t: "mediana por par", v: pct(res.map(r => r.tot).sort((a, b) => a - b)[Math.floor(res.length / 2)]) }, { t: "retorno de la cartera", v: pct(acum[acum.length - 1] - 1), col: acum[acum.length - 1] > 1 ? "var(--ok)" : "var(--bad)" }, { t: "volatilidad anual", v: pct(sd * Math.sqrt(252)) }, { t: "Sharpe", v: fmt2(sharpe), col: "var(--cobre)" }, { t: "operaciones por par", v: fmt2(media(res.map(r => r.o.ops))).slice(0, -3) }])}</div>` +
      `<div class="block stage"><div class="t">${sel.s.a} contra ${sel.s.b} (${sel.s.sa === sel.s.sb ? sel.s.sa : sel.s.sa + " / " + sel.s.sb}, beta ${fmt2(sel.s.beta)}): z-score y posición</div>${curva([{ pts: zs, col: "var(--q)", sw: 1.6 }, { pts: posPts, col: "var(--cobre)", sw: 2 }, { pts: [[0, 0], [t.length - 1, 0]], col: "var(--muted)", dash: true }], { xr: [0, t.length - 1], yr: [-zmax, zmax], xt, yt: [-zmax, -st.ent, 0, st.ent, zmax], xf: i => t[Math.round(i)].slice(0, 7), yf: v => fmt2(v).slice(0, -3) || fmt2(v), xl: "2024 y 2025", w: 460, h: 300, extra: [{ tipo: "hline", y: st.ent, col: "var(--bad)" }, { tipo: "hline", y: -st.ent, col: "var(--bad)" }, { tipo: "hline", y: st.stop, col: "var(--ink)" }, { tipo: "hline", y: -st.stop, col: "var(--ink)" }] })}${leyenda([["z-score", "var(--q)"], ["posición (+ largo, − corto)", "var(--cobre)"], ["entrada", "var(--bad)"], ["stop", "var(--ink)"]])}<p style="font-size:.85rem;color:var(--muted)">Retorno del par: ${pct(sel.tot)}, ${sel.o.ops} aperturas y cierres.</p></div>` +
      `<div class="block stage"><div class="t">Capital de la cartera equiponderada (1 = inicio)</div>${curva([{ pts: acum.map((v, i) => [i, v]), col: "var(--cobre)", sw: 2.5 }, { pts: [[0, 1], [t.length - 1, 1]], col: "var(--muted)", dash: true }], { xr: [0, t.length - 1], yr: [Math.min(0.9, ...acum) - 0.02, Math.max(1.1, ...acum) + 0.02], xt, yt: [Math.min(0.9, ...acum), 1, Math.max(1.1, ...acum)], xf: i => t[Math.round(i)].slice(0, 7), yf: fmt2, w: 460, h: 300 })}</div>` +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">Lo que el notebook calcula para todos los pares y para un control al azar (regla 2 / 0,5 / 4, sin costos)</div>${tabla(["lista", "parámetros", "pares", "positivos", "retorno cartera", "volatilidad", "Sharpe"], P.comparacion.map(r => ({ c: [NML[r.lista], NML[r.param], r.pares, pct0(r.pares_positivos), pct(r.retorno_cartera), pct(r.volatilidad_cartera), fmt2(r.sharpe_cartera)], cls: r.lista.includes("azar") ? "hi" : "" })), "cmp small")}</div>`;
    nota("par-bt-nota", `<b>Lectura.</b> Con los parámetros actuales la cartera de ${lista.length} pares ${acum[acum.length - 1] > 1 ? "gana" : "pierde"} ${pct(Math.abs(acum[acum.length - 1] - 1))} en dos años, con Sharpe ${fmt2(sharpe)}. ${st.zm === "f" ? "Con parámetros fijos el spread deriva: el z-score se queda meses fuera de rango y la regla abre con pérdida. Cambia a la ventana móvil." : "La ventana móvil evita la deriva, pero fíjate en la tabla de abajo: con todos los pares de cada método la cartera queda cerca de cero, igual que el control al azar. Lo que ves arriba en los 20 mejores es, en buena parte, ruido de selección."} Mueve los umbrales: una entrada más exigente opera menos, un stop más cercano corta pérdidas antes y también gana menos; y recuerda que elegir los umbrales mirando 2024 y 2025 ya es mirar el futuro.`);
    if (anim) stagger(el("par-s3"));
  }
  segmento("par-lista", "l", l => { st.lista = l; st.par = 0; el("par-par").value = "0"; if (st.paso === 3) rBt(false); });
  segmento("par-zm", "z", z => { st.zm = z; if (st.paso === 3) rBt(false); });
  el("par-ent").oninput = e => { st.ent = +e.target.value / 10; el("par-ent-v").textContent = fmt2(st.ent).slice(0, 3); if (st.paso === 3) rBt(false); };
  el("par-sal").oninput = e => { st.sal = +e.target.value / 10; el("par-sal-v").textContent = fmt2(st.sal).slice(0, 3); if (st.paso === 3) rBt(false); };
  el("par-stop").oninput = e => { st.stop = +e.target.value / 10; el("par-stop-v").textContent = fmt2(st.stop).slice(0, 3); if (st.paso === 3) rBt(false); };
  el("par-par").oninput = e => { st.par = +e.target.value; if (st.paso === 3) rBt(false); };
  function render(anim) { [rDatos, rV1, rV2, rBt][st.paso](anim); }
  el("par-replay").onclick = () => render(true);
  GOTO.par = pasoGenerico("par", 4, st, render);
  stepper("par", ["El problema", "Retorno y volatilidad", "Co-movimiento", "El backtest en vivo"], GOTO.par);
})();

// ===================== 03 SCF =====================
(function () {
  const st = ST.scf; const S = DATA.scf; const ORD = S.orden;
  const NMO = { "patrimonio consolidado": "patrimonio consolidado", "profesionales con familia": "profesionales con familia", "patrimonio bajo": "patrimonio bajo", "endeudados jóvenes": "endeudados jóvenes" };
  const NMG = { hombre: "hombre", mujer: "mujer", blanco: "blanco", negro: "negro", hispano: "hispano", otro: "otro", "población": "población" };
  const RZ = { blanco: "var(--q)", negro: "var(--cobre)", hispano: "var(--v)", otro: "#a78bfa" }, SX = { hombre: "var(--q)", mujer: "var(--cobre)" };
  function rDatos(anim) {
    const pz = S.ponderacion;
    el("scf-datos").innerHTML = kpi([{ t: "hogares", v: mil(S.hogares) }, { t: "filas del archivo", v: mil(S.filas), s: "cinco implicados por hogar" }, { t: "sin tolerancia al riesgo (ponderado)", v: pct(S.nofinrisk_nacional) }]) +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">Ignorar el ponderador describe la muestra (llena de ricos), no la población (dólares)</div>${tabla(["variable", "media sin ponderar", "media ponderada", "mediana sin ponderar", "mediana ponderada", "la media sin ponderar es ... veces la real"], Object.entries(pz).map(([v, r]) => ({ c: [({ INCOME: "ingreso", NETWORTH: "patrimonio neto", FIN: "activos financieros" })[v], mil(Math.round(r.media_sin_ponderar)), mil(Math.round(r.media_ponderada)), mil(Math.round(r.mediana_sin_ponderar)), mil(Math.round(r.mediana_ponderada)), fmt2(r["la media sin ponderar es ... veces la real"]).slice(0, -3) + " veces"], cls: v === "NETWORTH" ? "hi" : "" })), "cmp small")}</div>`;
    if (anim) stagger(el("scf-s0"));
  }
  function rFit(anim) {
    const ks = Object.keys(S.criterios).map(Number); const cr = ks.map(k => S.criterios[k]); const imax = Math.max(...cr.map(c => c.inercia));
    el("scf-fit").innerHTML = `<div class="block stage"><div class="t">Inercia</div>${curva([{ pts: ks.map((k, i) => [k, cr[i].inercia]), col: "var(--q)", marks: true }], { xr: [2, 8], yr: [0, imax * 1.05], xt: ks, yt: [0, imax / 2, imax], xf: String, yf: v => mil(Math.round(v / 1e6)) + " M", xl: "K", w: 360, h: 230, extra: [{ tipo: "vline", x: 4 }] })}</div>` +
      `<div class="block stage"><div class="t">Silueta</div>${curva([{ pts: ks.map((k, i) => [k, cr[i].silueta]), col: "var(--cobre)", marks: true }], { xr: [2, 8], yr: [0, 0.4], xt: ks, yt: [0, 0.25, 0.4], xf: String, yf: fmt2, xl: "K", w: 360, h: 230, extra: [{ tipo: "vline", x: 4 }, { tipo: "hline", y: 0.25, col: "var(--muted)" }] })}</div>` +
      `<div class="block stage"><div class="t">Variables de segmentación</div>${tabla(["variable", "tratamiento"], [{ c: ["edad", "tal cual"] }, { c: ["educación (1 a 4)", "ordinal"] }, { c: ["hijos", "tal cual"] }, { c: ["alfabetización financiera (0 a 3)", "ordinal"] }, { c: ["ingreso, patrimonio, activos financieros", "logaritmo con signo"] }, { c: ["sexo, raza", "<b>no se usan</b>"], cls: "hi" }], "cmp small")}</div>`;
    if (anim) stagger(el("scf-s1"));
  }
  function rPerf(anim) {
    const P = S.perfil;
    const filas = ORD.map(p => { const r = P[p]; return { c: [NMO[p], pct0(r["% de la población"]), fmt2(r.edad).slice(0, -3), fmt2(r["educación (1 a 4)"]), fmt2(r.hijos), mil(Math.round(r["ingreso mediano"])), mil(Math.round(r["patrimonio mediano"])), mil(Math.round(r["activos fin. medianos"])), pct0(r["% sin tolerancia al riesgo"]), pct0(r["% con acciones"])] }; });
    const col = st.col; const serie = col === "perfil" ? ORD.map((p, i) => ({ pts: S.muestra.filter(m => m[2] === i).map(m => [m[0], m[1]]), col: PAL[i], r: 2.5, op: 0.6 })) :
      col === "raza" ? Object.keys(RZ).map(r => ({ pts: S.muestra.filter(m => m[4] === r).map(m => [m[0], m[1]]), col: RZ[r], r: 2.5, op: 0.6 })) : Object.keys(SX).map(s => ({ pts: S.muestra.filter(m => m[3] === s).map(m => [m[0], m[1]]), col: SX[s], r: 2.5, op: 0.6 }));
    const ley = col === "perfil" ? ORD.map((p, i) => [NMO[p], PAL[i]]) : col === "raza" ? Object.entries(RZ).map(([k, v]) => [NMG[k], v]) : Object.entries(SX).map(([k, v]) => [NMG[k], v]);
    el("scf-perf").innerHTML = `<div class="block stage" style="flex:1 1 100%"><div class="t">Los cuatro segmentos, ponderados (dólares de 2022)</div>${tabla(["segmento", "% población", "edad", "educación", "hijos", "ingreso mediano", "patrimonio mediano", "activos fin. medianos", "sin tolerancia al riesgo", "con acciones"], filas, "cmp small")}</div>` +
      `<div class="block stage"><div class="t">1.200 hogares al azar en el plano edad y patrimonio, coloreados por ${({ perfil: "segmento", raza: "grupo racial", sexo: "sexo del jefe de hogar" })[col]}</div>${scatter(serie, { xr: [18, 95], yr: [-14, 22], xt: [20, 40, 60, 80], yt: [-10, 0, 10, 20], xf: String, yf: v => String(v), xl: "edad", yl: "patrimonio (log con signo)", w: 460, h: 340 })}${leyenda(ley)}</div>` +
      `<div class="block stage"><div class="t">Actitud y tenencia de riesgo por segmento</div>${barras(ORD.flatMap((p, i) => [{ lab: NMO[p] + ": sin tolerancia", v: P[p]["% sin tolerancia al riesgo"], txt: pct0(P[p]["% sin tolerancia al riesgo"]), cls: "pred" }, { lab: NMO[p] + ": con acciones", v: P[p]["% con acciones"], txt: pct0(P[p]["% con acciones"]), cls: "real" }]), { max: 1 })}<p style="font-size:.85rem;color:var(--muted);max-width:40ch">Promedio nacional sin tolerancia al riesgo: ${pct0(S.nofinrisk_nacional)}.</p></div>`;
    if (anim) stagger(el("scf-s2"));
  }
  function rSes(anim) {
    const g = st.grp; const comp = g === "raza" ? S.comp_raza : S.comp_sexo; const grupos = g === "raza" ? ["blanco", "negro", "hispano", "otro"] : ["hombre", "mujer"]; const COL = g === "raza" ? RZ : SX;
    const dist = S.dist;
    el("scf-ses").innerHTML = `<div class="block stage"><div class="t">Composición de cada segmento por ${g === "raza" ? "grupo racial" : "sexo del jefe de hogar"}, contra la población</div>${tabla(["segmento"].concat(grupos.map(x => NMG[x])), ORD.concat(["población"]).map(p => ({ c: [p === "población" ? NMG[p] : NMO[p]].concat(grupos.map(x => pct0(comp[p][x]))), cls: p === "población" ? "hi" : "" })), "cmp small")}</div>` +
      `<div class="block stage"><div class="t">Qué fracción de cada grupo cae en cada segmento (tasa de acceso)</div>${tabla(["grupo"].concat(ORD.map(p => NMO[p])), grupos.map(x => ({ c: [NMG[x]].concat(ORD.map(p => pct0(dist[x][p]))) })), "cmp small")}${barras(ORD.flatMap(p => grupos.map(x => ({ lab: `${NMO[p].split(" ")[0]}: ${NMG[x]}`, v: dist[x][p], txt: pct0(dist[x][p]) }))), { max: 0.7 })}</div>` +
      `<div class="block stage"><div class="t">Asociación segmento y grupo</div>${kpi([{ t: "V de Cramér, raza", v: fmt3(S.cramer.raza), col: "var(--cobre)" }, { t: "V de Cramér, sexo", v: fmt3(S.cramer.sexo), col: "var(--cobre)" }])}<p style="font-size:.85rem;color:var(--muted);max-width:40ch">0 es independencia y 1 determinación total; de 0,1 a 0,3 es asociación moderada. Los valores p del chi-cuadrado son menores a 10⁻⁹⁰.</p></div>`;
    const top = ORD[0], low = ORD[2];
    nota("scf-ses-nota", g === "raza" ? `<b>Lectura.</b> Entre los hogares hispanos, el ${pct0(dist.hispano[low])} está en "${NMO[low]}" y solo el ${pct0(dist.hispano[top])} en "${NMO[top]}"; entre los blancos, ${pct0(dist.blanco[low])} y ${pct0(dist.blanco[top])}. Si la regla fuera "productos de mayor retorno esperado para el segmento consolidado", la tasa de acceso de un hogar blanco sería ${fmt2(dist.blanco[top] / dist.hispano[top]).slice(0, 3)} veces la de uno hispano. Y el segmento de los endeudados tiene una de cada cuatro familias negra, el doble de su peso en la población.` : `<b>Lectura.</b> El ${pct0(dist.mujer[low])} de los hogares con jefa de hogar mujer cae en "${NMO[low]}" y el ${pct0(dist.mujer[ORD[3]])} en "${NMO[ORD[3]]}", contra ${pct0(dist.hombre[low])} y ${pct0(dist.hombre[ORD[3]])} de los hogares con jefe hombre; en "${NMO[top]}" la relación se invierte (${pct0(dist.mujer[top])} contra ${pct0(dist.hombre[top])}). El segmento de los endeudados tiene mayoría de jefas de hogar.`);
    if (anim) stagger(el("scf-s3"));
  }
  segmento("scf-grp", "g", g => { st.grp = g; if (st.paso === 3) rSes(false); });
  segmento("scf-col", "c", c => { st.col = c; if (st.paso === 2) rPerf(false); });
  function render(anim) { [rDatos, rFit, rPerf, rSes][st.paso](anim); }
  el("scf-replay").onclick = () => render(true);
  GOTO.scf = pasoGenerico("scf", 4, st, render);
  stepper("scf", ["La encuesta y sus trampas", "Segmentar hogares", "Los cuatro perfiles", "Los sesgos"], GOTO.scf);
})();

// ===================== 04 HRP =====================
(function () {
  const st = ST.hrp; const H = DATA.hrp; const IND = H.industrias; const N = IND.length;
  const REG = ["1/N", "inversa de varianza", "mínima varianza (sin restricción)", "mínima varianza (solo largos)", "paridad de riesgo", "máximo Sharpe", "HRP"];
  const NMR = { "1/N": "1/N", "inversa de varianza": "inversa de varianza", "mínima varianza (sin restricción)": "mínima varianza (sin restricción)", "mínima varianza (solo largos)": "mínima varianza (solo largos)", "paridad de riesgo": "paridad de riesgo", "máximo Sharpe": "máximo Sharpe", "HRP": "HRP" };
  const RCOL = { "1/N": "var(--q)", "inversa de varianza": "#94a3b8", "mínima varianza (sin restricción)": "var(--bad)", "mínima varianza (solo largos)": "#f472b6", "paridad de riesgo": "var(--v)", "máximo Sharpe": "#a78bfa", "HRP": "var(--cobre)" };
  function rRep(anim) {
    const vols = IND.map(i => H.vol[i]).sort((a, b) => a - b);
    el("hrp-rep").innerHTML = kpi([{ t: "industrias", v: N }, { t: "días", v: mil(H.dias), s: `${H.desde} a ${H.hasta}` }, { t: "volatilidad anual", v: pct0(vols[0]) + " a " + pct0(vols[N - 1]), s: "mediana " + pct0(vols[Math.floor(N / 2)]) }, { t: "correlación promedio", v: fmt2(H.corr_media) }]) +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">Las reglas de asignación</div>${tabla(["regla", "pesos", "qué necesita estimar"], [{ c: ["1/N (equiponderada)", "w<sub>i</sub> = 1/N", "nada"] }, { c: ["inversa de la varianza", "w<sub>i</sub> ∝ 1/σ<sub>i</sub>²", "solo las varianzas"] }, { c: ["mínima varianza", "w ∝ Σ⁻¹ 1", "toda la matriz Σ, y hay que invertirla"] }, { c: ["paridad de riesgo", "igual contribución al riesgo", "toda la matriz Σ"] }, { c: ["máximo Sharpe", "w ∝ Σ⁻¹ μ", "Σ y además μ"], cls: "hi" }, { c: ["HRP", "bisección sobre el árbol", "Σ, sin invertirla"] }], "cmp small")}</div>`;
    if (anim) stagger(el("hrp-s0"));
  }
  function rEst(anim) {
    const I = H.inestabilidad;
    el("hrp-est").innerHTML = `<div class="block stage" style="flex:1 1 100%"><div class="t">Pesos estimados con 2022 y cuánto cambian al reestimar con 2023</div>${tabla(["regla", "peso máximo", "peso mínimo", "posiciones cortas", "activos efectivos", "rotación 2022 a 2023"], Object.entries(I).map(([r, x]) => ({ c: [NMR[r], pct(x.peso_maximo_2022), pct(x.peso_minimo_2022), x.cortos_2022, fmt2(x.activos_efectivos_2022).slice(0, -3) || fmt2(x.activos_efectivos_2022), pct0(x.rotacion_2022_a_2023)], cls: r === "máximo Sharpe" ? "hi" : "" })), "cmp small")}</div>` +
      `<div class="block stage"><div class="t">Número efectivo de activos (49 = partes iguales)</div>${barras(Object.entries(I).map(([r, x]) => ({ lab: NMR[r], v: x.activos_efectivos_2022, txt: fmt2(x.activos_efectivos_2022).slice(0, -3) || fmt2(x.activos_efectivos_2022), cls: r === "máximo Sharpe" ? "pred" : "" })), { max: 49 })}</div>`;
    if (anim) stagger(el("hrp-s1"));
  }
  function dendro(Z, labels) {
    // dibuja el dendrograma a partir de la matriz de enlace (scipy) en el orden cuasi-diagonal
    const n = labels.length; const orden = H.orden; const posx = {}; orden.forEach((i, q) => posx[i] = q);
    const W = 940, Hh = 330, ml = 10, mb = 70, mt = 10; const X = q => ml + q * (W - 2 * ml) / (n - 1); const hmax = Math.max(...Z.map(z => z[2])); const Y = h => mt + (1 - h / hmax) * (Hh - mt - mb);
    const nodo = {}; for (let i = 0; i < n; i++) nodo[i] = { x: X(posx[i]), h: 0 };
    let s = `<svg class="chart" viewBox="0 0 ${W} ${Hh}" width="100%">`;
    Z.forEach((z, k) => { const a = nodo[z[0]], b = nodo[z[1]]; const h = z[2]; s += `<path d="M${a.x},${Y(a.h)} L${a.x},${Y(h)} L${b.x},${Y(h)} L${b.x},${Y(b.h)}" fill="none" stroke="${h > 0.7 * hmax ? "var(--muted)" : PAL[k % 3]}" stroke-width="1.2"/>`; nodo[n + k] = { x: (a.x + b.x) / 2, h }; });
    orden.forEach((i, q) => s += `<text x="${X(q)}" y="${Hh - mb + 12}" class="tick" transform="rotate(90 ${X(q)} ${Hh - mb + 12})" style="font-size:9px">${labels[i]}</text>`);
    return s + "</svg>";
  }
  function heatmap(ordenado) {
    const idx = ordenado ? H.orden : [...Array(N).keys()]; const W = 420, cell = W / N;
    let s = `<svg class="chart" viewBox="0 0 ${W} ${W}" width="100%" style="max-width:${W}px">`;
    idx.forEach((i, a) => idx.forEach((j, b) => { const v = H.corr[i][j]; const t = Math.max(0, Math.min(1, v)); const col = `hsl(${(1 - t) * 220}, 80%, ${55 - t * 15}%)`; s += `<rect x="${b * cell}" y="${a * cell}" width="${cell + 0.3}" height="${cell + 0.3}" fill="${col}"/>`; }));
    return s + "</svg>";
  }
  function rArbol(anim) {
    const grupos = {}; H.grupos6.forEach((g, i) => (grupos[g] = grupos[g] || []).push(IND[i]));
    el("hrp-arbol").innerHTML = `<div class="block stage" style="flex:1 1 100%"><div class="t">Dendrograma de las 49 industrias (enlace single, distancia de distancias), hojas en el orden cuasi-diagonal</div>${dendro(H.linkage, IND)}</div>` +
      `<div class="block stage"><div class="t">Correlaciones en ${st.ord === "arbol" ? "el orden del dendrograma: los bloques aparecen" : "orden alfabético: no se ve nada"}</div>${heatmap(st.ord === "arbol")}<p style="font-size:.85rem;color:var(--muted);max-width:40ch">Rojo: correlación alta; azul: baja. Mismos números, distinto orden.</p></div>` +
      `<div class="block stage"><div class="t">Seis grupos (enlace ward) y lo que el algoritmo encontró sin saber de sectores</div>${tabla(["grupo", "industrias"], Object.entries(grupos).map(([g, m]) => ({ c: [g, m.join(", ")], cls: m.length === 1 ? "hi" : "" })), "cmp small")}<p style="font-size:.85rem;color:var(--muted);max-width:44ch">El oro queda solo (correlación promedio con el resto ${fmt2(media(IND.filter(i => i !== "Gold").map(i => H.corr[IND.indexOf("Gold")][IND.indexOf(i)])))}, contra ${fmt2(H.corr_media)} general): el único diversificador genuino del universo.</p></div>` +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">Pesos de cada regla sobre toda la muestra (industrias en el orden del árbol)</div>${tabla(["industria"].concat(REG.filter(r => r !== "máximo Sharpe").map(r => NMR[r])), H.orden_etiquetas.map(i => ({ c: [i].concat(REG.filter(r => r !== "máximo Sharpe").map(r => { const v = H.pesos[r][i]; return `<span style="color:${v < 0 ? "var(--bad)" : v > 0.05 ? "var(--cobre)" : "inherit"}">${pct(v)}</span>`; })) })), "cmp small")}</div>`;
    if (anim) stagger(el("hrp-s2"));
  }
  function rBt(anim) {
    const R = st.uni === "49" ? H.resumen49 : H.resumen_etf; const C = st.uni === "49" ? H.curvas49 : H.curvas_etf;
    const regs = REG.filter(r => r in R);
    const t = C.fechas; const xt = [0, Math.floor(t.length / 2), t.length - 1]; const series = Object.entries(C.series);
    const ymax = Math.max(...series.flatMap(([, v]) => v)); const log = st.uni === "49";
    const tr = v => log ? Math.log(v) : v;
    let html = `<div class="block stage" style="flex:1 1 100%"><div class="t">${st.uni === "49" ? "49 industrias, 2001 en adelante" : "14 ETF, 2008 en adelante"}: ventana de 252 días, reestimación mensual, fuera de muestra</div>${tabla(["regla", "retorno anual", "volatilidad", "Sharpe", "caída máxima", "rotación mensual"], regs.map(r => ({ c: [NMR[r], pct(R[r].retorno), pct(R[r].volatilidad), fmt2(R[r].sharpe), pct(R[r].caida_maxima), pct(R[r].rotacion_mensual)], cls: r === "máximo Sharpe" ? "hi" : "" })), "cmp small")}</div>` +
      `<div class="block stage" style="flex:1 1 100%"><div class="t">Capital acumulado (sin el máximo Sharpe, que estalla)${log ? ", escala log" : ""}</div>${curva(series.map(([r, v]) => ({ pts: v.map((x, i) => [i, tr(x)]), col: RCOL[r], sw: r === "1/N" || r === "HRP" ? 2.8 : 1.3 })), { xr: [0, t.length - 1], yr: [tr(0.8), tr(ymax)], xt, yt: log ? [0, Math.log(2), Math.log(ymax)] : [1, (1 + ymax) / 2, ymax], xf: i => t[Math.round(i)].slice(0, 4), yf: v => fmt2(log ? Math.exp(v) : v).slice(0, -1), w: 940, h: 320 })}${leyenda(series.map(([r]) => [NMR[r], RCOL[r]]))}</div>`;
    if (st.uni === "etf") {
      const acc = ["SPY", "QQQ", "IWM", "EFA", "EEM"];
      html += `<div class="block stage" style="flex:1 1 100%"><div class="t">Quién aporta el riesgo: 1/N reparte el dinero, no el riesgo (contribución a la varianza, toda la muestra)</div>${tabla(["ETF", "volatilidad"].concat(Object.keys(H.contrib).map(r => NMR[r])), H.etf.map(e => ({ c: [e, pct0(H.vol_etf[e])].concat(Object.keys(H.contrib).map(r => pct(H.contrib[r][e]))), cls: acc.includes(e) ? "hi" : "" })).concat([{ c: ["<b>cinco ETF de acciones</b>", ""].concat(Object.keys(H.contrib).map(r => "<b>" + pct0(acc.reduce((s, e) => s + H.contrib[r][e], 0)) + "</b>")) }]), "cmp small")}</div>`;
    }
    el("hrp-bt").innerHTML = html;
    nota("hrp-bt-nota", st.uni === "49" ? `<b>Lectura.</b> El máximo Sharpe estalla (volatilidad ${pct0(R["máximo Sharpe"].volatilidad)}, rotación de ${fmt2(R["máximo Sharpe"].rotacion_mensual).slice(0, -3)} veces la cartera al mes). Todo lo demás rinde parecido: 1/N tiene Sharpe ${fmt2(R["1/N"].sharpe)} y HRP ${fmt2(R["HRP"].sharpe)}, con volatilidad ${pct0(R["1/N"].volatilidad)} contra ${pct0(R["HRP"].volatilidad)} y una rotación de ${pct0(R["HRP"].rotacion_mensual)} al mes, cinco veces menor que la mínima varianza sin restricción (${pct0(R["mínima varianza (sin restricción)"].rotacion_mensual)}).` : `<b>Lectura.</b> Cinco ETF de acciones aportan ${pct0(["SPY", "QQQ", "IWM", "EFA", "EEM"].reduce((s, e) => s + H.contrib["1/N"][e], 0))} del riesgo de la cartera 1/N. Las reglas basadas en riesgo bajan la volatilidad de ${pct0(R["1/N"].volatilidad)} a ${pct0(R["HRP"].volatilidad)} (HRP) y la caída máxima de ${pct0(-R["1/N"].caida_maxima)} a ${pct0(-R["HRP"].caida_maxima)}, con Sharpe parecido (${fmt2(R["1/N"].sharpe)} contra ${fmt2(R["paridad de riesgo"].sharpe)} de la paridad de riesgo y ${fmt2(R["HRP"].sharpe)} de HRP). El precio es menos retorno absoluto: la cartera queda cargada a bonos.`);
    if (anim) stagger(el("hrp-s3"));
  }
  function rFin(anim) {
    const a = H.resumen49, b = H.resumen_etf;
    el("hrp-fin").innerHTML = `<div class="block stage" style="flex:1 1 100%"><div class="t">Las dos tablas, lado a lado: volatilidad y Sharpe fuera de muestra</div>${tabla(["regla", "49 industrias: volatilidad", "Sharpe", "14 ETF: volatilidad", "Sharpe", "rotación mensual (ETF)"], REG.filter(r => r !== "máximo Sharpe").map(r => ({ c: [NMR[r], pct(a[r].volatilidad), fmt2(a[r].sharpe), pct(b[r].volatilidad), fmt2(b[r].sharpe), pct(b[r].rotacion_mensual)], cls: r === "1/N" || r === "HRP" ? "hi" : "" })), "cmp small")}</div>` +
      `<div class="block stage"><div class="t">Cuándo usar qué</div>${tabla(["situación", "regla razonable"], [{ c: ["activos parecidos entre sí, pocos", "1/N (y es el benchmark siempre)"] }, { c: ["activos con riesgos muy distintos", "inversa de varianza, paridad de riesgo o HRP"] }, { c: ["muchos activos, pocas observaciones", "HRP (no invierte la matriz)"] }, { c: ["restricciones de posición, costos", "HRP o paridad de riesgo: sin cortos, poca rotación"] }, { c: ["retornos esperados estimados con promedios", "ninguna: no funciona"], cls: "hi" }], "cmp small")}</div>`;
    if (anim) stagger(el("hrp-s4"));
  }
  segmento("hrp-uni", "u", u => { st.uni = u; if (st.paso === 3) rBt(false); });
  segmento("hrp-ord", "o", o => { st.ord = o; if (st.paso === 2) rArbol(false); });
  function render(anim) { [rRep, rEst, rArbol, rBt, rFin][st.paso](anim); }
  el("hrp-replay").onclick = () => render(true);
  GOTO.hrp = pasoGenerico("hrp", 5, st, render);
  stepper("hrp", ["Repaso de carteras", "El problema de estimación", "HRP paso a paso", "Fuera de muestra", "¿Para qué complicarse?"], GOTO.hrp);
})();

let modeloInicial = (init && init.m && GOTO[init.m]) ? init.m : "seg";
if (init && typeof init.paso === "number" && ST[modeloInicial]) ST[modeloInicial].paso = init.paso;
quieto = true; irModelo(modeloInicial); quieto = false;
return { getState: () => ({ m: modeloActual, paso: ST[modeloActual].paso }) };
}
