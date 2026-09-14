/* Équité des roulements : compteurs par famille, cycle du lavage des
   maillots, suggestions, et planification de plusieurs matchs d'un coup. */
import {S, setS} from '../core/state.js';
import {eligible, estPasse, full, nbTransport} from './model.js';

export function counts(exclude){
  const c={};
  S.players.forEach(p=>c[p.id]={transport:0,bar:0,lavage:0,total:0,convocs:0,abs:0});
  S.matches.forEach(m=>{
    if(exclude&&m.id===exclude)return;
    (m.convoques||[]).forEach(id=>{if(c[id])c[id].convocs++});
    (m.absents||[]).forEach(id=>{if(c[id])c[id].abs++});
    ['transport','bar','lavage'].forEach(t=>{
      (m[t]||[]).forEach(id=>{if(c[id]){c[id][t]++;c[id].total++}});
    });
  });
  return c;
}

export function cycle(m){
  const c=counts(m?m.id:null), act=eligible();
  if(!act.length)return {tour:0,left:[],done:[],total:0};
  const min=Math.min(...act.map(p=>c[p.id].lavage));
  return {tour:min+1,total:act.length,
    left:act.filter(p=>c[p.id].lavage===min).map(p=>p.id),
    done:act.filter(p=>c[p.id].lavage>min).map(p=>p.id)};
}

export function suggest(m,type,n){
  const c=counts(m.id), abs=new Set(m.absents||[]);
  const ok=new Set(eligible().map(p=>p.id).filter(id=>!abs.has(id)));
  const cv=(m.convoques||[]).filter(id=>ok.has(id));
  const conv=cv.length?cv:null, all=[...ok];
  let pool;
  if(type==='lavage'){
    const cy=cycle(m), left=cy.left.filter(id=>!abs.has(id));
    pool=conv?left.filter(id=>conv.includes(id)):left.slice();
    if(!pool.length)pool=left.slice();
    if(!pool.length)pool=conv||all;
  }else pool=conv||all;
  const busy=new Set([].concat(...['transport','bar','lavage'].filter(k=>k!==type).map(k=>m[k]||[])));
  pool.sort((a,b)=>{
    const A=c[a]||{},B=c[b]||{};
    return (busy.has(a)-busy.has(b))||((A[type]||0)-(B[type]||0))||((A.total||0)-(B.total||0))
      ||full(a).localeCompare(full(b),'fr');
  });
  return pool.slice(0,n);
}

/* ---- planification de plusieurs matchs d'un coup ---- */
/* Le calcul tourne sur une copie de l'état : les compteurs d'équité s'accumulent
   d'un match au suivant, exactement comme si on les attribuait un par un. */
export function planCompute(ids,tasks,mode,convoquer){
  const backup=S, clone=JSON.parse(JSON.stringify(S));
  const ordre=ids.slice().sort((a,b)=>{
    const A=S.matches.find(x=>x.id===a)||{}, B=S.matches.find(x=>x.id===b)||{};
    return ((A.date||'')+(A.heure||'')).localeCompare((B.date||'')+(B.heure||''));
  });
  setS(clone);
  try{
    ordre.forEach(id=>{
      const m=clone.matches.find(x=>x.id===id);
      if(!m||estPasse(m))return;   /* un match passé n'est jamais recalculé */
      if(convoquer&&!(m.convoques||[]).length)
        m.convoques=clone.players.filter(p=>p.actif&&!(m.absents||[]).includes(p.id)).map(p=>p.id);
      const dom=m.lieu==='domicile', jobs=[];
      if(dom&&tasks.bar)jobs.push(['bar',2]);
      if(!dom&&tasks.transport)jobs.push(['transport',nbTransport(m)]);
      if(tasks.lavage)jobs.push(['lavage',1]);
      jobs.forEach(([k,n])=>{
        if(mode==='all')m[k]=[];
        m[k]=m[k]||[];
        if(m[k].length>=n)return;
        const manque=n-m[k].length;
        const add=suggest(m,k,n).filter(x=>!m[k].includes(x)).slice(0,manque);
        m[k]=m[k].concat(add);
      });
    });
  } finally { setS(backup); }
  return {clone,ordre};
}
