/* Écran Équité : répartition des tours par famille. */
import {I} from '../core/icons.js';
import {S} from '../core/state.js';
import {esc} from '../core/utils.js';
import {byNom, eligible, pre} from '../domain/model.js';
import {counts, cycle} from '../domain/roulements.js';

export function equityView(){
  const c=counts(null), all=S.players.filter(p=>p.actif);
  const list=eligible().sort((a,b)=>(c[a.id].total-c[b.id].total)||byNom(a,b));
  const exempts=all.filter(p=>!list.includes(p));
  const max=Math.max(1,...list.map(p=>c[p.id].total));
  const tot=list.reduce((s,p)=>s+c[p.id].total,0);
  const ecart=list.length?c[list[list.length-1].id].total-c[list[0].id].total:0;
  const cy=cycle(null);

  const kv=(cls,ic,v)=>`<span class="kv ${cls}${v?'':' z'}">${I(ic,14)}${v}</span>`;
  const rows=list.map(p=>{
    const k=c[p.id], w=x=>(x/max*100)+'%';
    return `<div class="brow">
      <span class="bname">${esc(p.prenom)} ${esc(p.nom)}<small>${k.convocs} convocation${k.convocs>1?'s':''}</small></span>
      <span class="bnums">${kv('tr','car',k.transport)}${kv('ba','cup',k.bar)}${kv('la','shirt',k.lavage)}<b class="btot">${k.total}</b></span>
      <span class="bars"><i class="b-tr" style="width:${w(k.transport)}"></i><i class="b-bar" style="width:${w(k.bar)}"></i><i class="b-lav" style="width:${w(k.lavage)}"></i></span>
    </div>`;
  }).join('');

  const etat = !tot ? 'Aucun tour attribué pour l\u2019instant.'
    : ecart===0 ? 'Répartition parfaitement équilibrée.'
    : ecart===1 ? 'Répartition équilibrée, un tour d\u2019écart au maximum.'
    : 'Écart de '+ecart+' tours entre la famille la plus et la moins sollicitée. Le bouton « Proposer » corrige de lui-même.';

  return `
  <div class="card"><div class="card-b">
    <h3 style="font-size:15px">Répartition des tours</h3>
    <div class="tiny" style="margin:3px 0 14px">${tot} tour${tot>1?'s':''} sur ${list.length} famille${list.length>1?'s':''} · ${esc(etat)}</div>
    ${rows||'<div class="tiny">Aucun joueur dans les roulements.</div>'}
    <div class="legend"><span><i class="b-tr"></i>Transport</span><span><i class="b-bar"></i>Bar</span><span><i class="b-lav"></i>Maillots</span></div>
  </div></div>

  ${cy.total?`<div class="card" style="margin-top:12px"><div class="card-b" style="display:flex;gap:12px;align-items:flex-start">
    ${I('shirt',20)}<div><b style="font-size:14.5px">Maillots — tour ${cy.tour}</b>
    <div class="tiny" style="margin-top:3px">${cy.total-cy.left.length} famille${cy.total-cy.left.length>1?'s':''} sur ${cy.total} ${cy.total-cy.left.length>1?'sont passées':'est passée'}${cy.left.length?'. Il reste : '+cy.left.map(id=>esc(pre(id))).join(', '):'. Tour complet, un nouveau démarre au prochain match.'}</div></div>
  </div></div>`:''}

  ${exempts.length?`<div class="card" style="margin-top:12px"><div class="card-b" style="display:flex;gap:12px;align-items:flex-start">
    ${I('board',20)}<div><b style="font-size:14.5px">Hors roulement</b>
    <div class="tiny" style="margin-top:3px">${exempts.map(p=>esc(p.prenom+' '+p.nom)).join(', ')} — famille d${exempts.length>1?'e coachs':'\u2019un coach'}. Modifiable dans Réglages.</div></div>
  </div></div>`:''}`;
}
