import fs from 'fs'; import { JSDOM } from '/home/claude/hub/regression_intro_playground/node_modules/jsdom/lib/api.js';
const lang=process.argv[2]||'es'; const R=new URL('../src/engine/', import.meta.url).pathname;
const body=fs.readFileSync(R+`body.${lang}.html`,'utf8'); const DATA=JSON.parse(fs.readFileSync(R+`data.${lang}.json`,'utf8'));
const dom=new JSDOM(`<!doctype html><html><body>${body}</body></html>`); const {window}=dom; window.matchMedia=()=>({matches:true}); window.scrollTo=()=>{}; globalThis.window=window; globalThis.document=window.document; globalThis.matchMedia=window.matchMedia;
const t0=Date.now(); const mod=await import(R+`engine.${lang}.js?x=${Date.now()}`); const api=mod.initEngine(DATA); const d=window.document; let bad=0;
const ev=(e,v)=>{e.value=v; e.dispatchEvent(new window.Event('input',{bubbles:true}));};
for (const b of d.querySelectorAll('#tabs button')) { b.click(); const m=b.dataset.m;
  for (const s of d.querySelectorAll(`#${m}-rail button`)) { const t1=Date.now(); s.click(); const p=d.querySelector(`#${m}-s${s.dataset.p}`);
    // mover todos los controles visibles
    for (const c of d.querySelectorAll(`#m-${m} .controls .ctrl`)) { if (c.style.display==='none') continue; for (const sb of c.querySelectorAll('.seg button')) sb.click(); for (const r of c.querySelectorAll('input[type=range]')) { ev(r, r.max); ev(r, r.min); ev(r, String(Math.round((+r.min + +r.max)/2))); } }
    const txt=p.textContent.replace(/\s+/g,' '); const nan=/NaN|undefined|null/.test(txt); if(nan) bad++;
    console.log(m, s.dataset.p, nan?'BAD':'ok', 'svg',p.querySelectorAll('svg').length,'tables',p.querySelectorAll('table').length, (Date.now()-t1)+'ms', (p.querySelector('.note')?.textContent||'').slice(0,160)); } }
console.log('total', (Date.now()-t0)+'ms', 'bad', bad);
