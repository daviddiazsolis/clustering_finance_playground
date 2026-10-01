// Comprueba que engine.en.js es idéntico a engine.es.js salvo en los literales de texto y comentarios.
import fs from 'fs'; const acorn = await import('/opt/node-tools/node_modules/acorn/dist/acorn.mjs');
function toks(src){const out=[];for(const t of acorn.tokenizer(src,{ecmaVersion:'latest',sourceType:'module'})){let v=t.type.label;if(v==='string'||v==='template')v='STR';else if(v==='name')v='name:'+t.value;else if(v==='num')v='num:'+t.value;else if(typeof t.value==='string')v=v+':'+t.value;out.push(v);}return out;}
const R=new URL('../src/engine/', import.meta.url).pathname;
const a=toks(fs.readFileSync(R+'engine.es.js','utf8')), b=toks(fs.readFileSync(R+'engine.en.js','utf8'));
let bad=-1;for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i]){bad=i;break;}
console.log(bad<0?'TOKENS OK '+a.length:'DIFF at '+bad+' es='+a.slice(bad,bad+6).join(' ')+' | en='+b.slice(bad,bad+6).join(' '));
