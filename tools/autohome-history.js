#!/usr/bin/env node
// Rebuild historical trims from AutoHome public series/config pages.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BRANDS = path.join(ROOT, 'autohome-main', 'brands.csv');
const OUT = path.join(ROOT, 'history-data');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897';
const important = ['比亚迪','丰田','大众','本田','日产','宝马','奔驰','奥迪','吉利','吉利汽车','吉利银河','吉利几何','长安','哈弗','奇瑞','特斯拉','五菱','红旗','现代','起亚','福特','沃尔沃','理想','蔚来','小鹏','领克','广汽传祺','荣威','别克'];

function csvLine(s) { const a=[]; let v='', q=false; for (let i=0;i<s.length;i++){const c=s[i]; if(c==='"'){if(q&&s[i+1]==='"'){v+='"';i++;}else q=!q;} else if(c===','&&!q){a.push(v);v='';} else v+=c;} a.push(v); return a; }
function fetchBytes(url) { const r=spawnSync('curl.exe',['-x',PROXY,'-L','--max-time','45','-A','Mozilla/5.0','-sS',url],{encoding:null}); if(r.status!==0) throw new Error(`curl ${r.status}: ${r.stderr}`); return r.stdout; }
function decode(b) { const u=new TextDecoder('utf-8').decode(b); return (u.includes('\ufffd') ? new TextDecoder('gb18030').decode(b) : u); }
function strip(s){return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function parseSeries(html, seriesId, seriesName) {
  const rows=[]; const blockRe=/<div class="interval01[^>]*>\s*<div class="interval01-title[\s\S]*?<span class="interval01-list-cars-text">\s*([^<]+?)\s*<\/span>[\s\S]*?<\/div>\s*<ul class="interval01-list">([\s\S]*?)<\/ul>/g;
  let bm; while((bm=blockRe.exec(html))){ const year=strip(bm[1]); const body=bm[2]; const liRe=/<li[^>]*data-value="(\d+)"[^>]*>([\s\S]*?)<\/li>/g; let lm;
    while((lm=liRe.exec(body))){ const id=lm[1], x=lm[2]; const nm=(x.match(/<p[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/)||[])[1]; if(!nm) continue; const pm=(x.match(/interval01-list-guidance[\s\S]*?<div>\s*(?:<a[\s\S]*?<\/a>)?\s*([^<]+?)\s*<\/div>/)||[])[1]; rows.push({source:'autohome',series_id:String(seriesId),series:seriesName,year,trim:strip(nm),spec_id:id,price:strip(pm||''),config_url:`https://car.autohome.com.cn/config/spec/${id}.html`}); }
  } return rows;
}
function balanced(s, start){let d=0,q=false; for(let i=start;i<s.length;i++){const c=s[i]; if(c==='"'&&s[i-1]!=='\\')q=!q; if(q)continue; if(c==='{')d++; else if(c==='}'&&!--d)return s.slice(start,i+1);} return null;}
function parseConfig(html,targetSpec){ const out={}; const walk=(groups)=>{for(const g of groups||[]) for(const item of (g.paramitems||g.configitems||[])){const n=strip(item.name||''); if(!n)continue; const v=(item.valueitems||[]).find(x=>String(x.specid)===String(targetSpec)); if(v&&v.value!=null) out[n]=strip(v.value);}}; for(const varName of ['config','option']){const re=new RegExp('var\\s+'+varName+'\\s*=\\s*'); const m=re.exec(html); if(!m)continue; const obj=balanced(html,m.index+m[0].length); if(!obj)continue; try{const j=JSON.parse(obj); walk(j.result?.paramtypeitems); walk(j.result?.configtypeitems);}catch{}} return out; }
function readBrands(){return fs.readFileSync(BRANDS,'utf8').split(/\r?\n/).filter(Boolean).slice(1).map(csvLine).filter(x=>x[1]&&x[2]).map(x=>({name:x[0].replace(/\s*\([^)]*\)\s*$/,''),id:(x[1].match(/series_(\d+)/)||[])[1],url:x[2]}));}
async function main(){const args=process.argv.slice(2), get=(k)=>{const i=args.indexOf(k);return i<0?null:args[i+1]}; let selected=readBrands(); const ids=get('--series'); if(ids)selected=selected.filter(x=>ids.split(',').includes(x.id)); else {const b=get('--brands'); const bs=(b?b.split(','):important); selected=selected.filter(x=>bs.some(k=>x.name.includes(k)));} const limit=+(get('--limit')||0); if(limit)selected=selected.slice(0,limit); fs.mkdirSync(OUT,{recursive:true}); let total=0;
  for(const s of selected){try{let html=decode(fetchBytes(s.url)); let pages=[s.url]; for(const href of (html.match(new RegExp('href="([^\"]*series-'+s.id+'[^\"]*)"','g'))||[])){const u=href.match(/href="([^\"]+)/)[1]; const abs=u.startsWith('http')?u:'https://car.autohome.com.cn'+u; if(!pages.includes(abs))pages.push(abs);} let rows=[]; for(const u of pages.slice(0,30)){try{rows.push(...parseSeries(decode(fetchBytes(u)),s.id,s.name));}catch(e){console.error(` page failed ${u}: ${e.message}`);}} const seen=new Set(); rows=rows.filter(x=>!seen.has(x.spec_id)&&seen.add(x.spec_id)); const withConfig=args.includes('--with-config'); if(withConfig){for(let i=0;i<rows.length;i++){try{rows[i].features=parseConfig(decode(fetchBytes(rows[i].config_url)),rows[i].spec_id);}catch(e){rows[i].config_error=String(e.message);}}} fs.writeFileSync(path.join(OUT,`${s.id}.json`),JSON.stringify({source:'autohome',series_id:s.id,series:s.name,fetched_at:new Date().toISOString(),count:rows.length,pages:pages.length,items:rows},null,2)); total+=rows.length; console.log(`${s.name} (${s.id}): ${rows.length} trims, ${pages.length} pages`);}catch(e){console.error(`${s.name} (${s.id}) FAILED: ${e.message}`);}}
  console.log(`done: ${selected.length} series, ${total} trims`);
}
main();
