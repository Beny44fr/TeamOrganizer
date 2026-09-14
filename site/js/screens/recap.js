/* Récapitulatif « qui fait quoi », match par match. */
import {I} from '../core/icons.js';
import {S} from '../core/state.js';
import {aujourdhui, COARSE, esc, toHM, toMin} from '../core/utils.js';
import {coachName, nbTransport, pre, sortedMatches, times} from '../domain/model.js';

export function recapView(){
  const ms=sortedMatches(), today=aujourdhui();
  if(!ms.length)return `<div class="card"><div class="empty">${I('board',30)}<b>Aucun match</b>Le tableau se remplira dès que vous aurez ajouté des matchs.</div></div>`;
  const nm=(a,att)=>{
    if(a===null)return '<span class="na">—</span>';
    if(!a||!a.length)return '<span class="miss">à définir</span>';
    return a.map(id=>esc(pre(id))).join(', ')+(att&&a.length<att?' <span class="miss">+'+(att-a.length)+'</span>':'');
  };
  const rows=ms.map(m=>{
    const t=times(m), dom=m.lieu==='domicile', past=(m.date||'')<today;
    const d=new Date(m.date+'T12:00:00');
    return `<tr class="${past?'pastrow':''}">
      <td class="mt">
        <button class="lnk" onclick="BB.open('${m.id}')">${esc(m.adversaire||'Adversaire ?')}</button>
        <span class="sub">${isNaN(d)?esc(m.date):d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})} · ${esc(dom?'domicile':'extérieur')}</span>
      </td>
      <td class="num">${toHM(t.rdv)}<span class="sub">match ${toHM(toMin(m.heure))}</span></td>
      <td class="num">${(m.convoques||[]).length||'<span class="miss">0</span>'}${(m.absents||[]).length?`<span class="sub">${(m.absents||[]).length} abs.</span>`:''}</td>
      <td>${nm(dom?null:m.transport,nbTransport(m))}</td>
      <td>${nm(dom?m.bar:null,2)}</td>
      <td>${nm(m.lavage,1)}</td>
      <td>${(m.staff||[]).length?(m.staff||[]).map(id=>esc(coachName(id))).join(', '):'<span class="na">—</span>'}</td>
    </tr>`;
  }).join('');
  const tot=k=>S.matches.reduce((n,m)=>n+((m[k]||[]).length),0);
  return `
  <div class="row" style="margin-bottom:12px">
    <span class="tiny" style="flex:1">${ms.length} match${ms.length>1?'s':''} · ${tot('transport')} transports · ${tot('bar')} bars · ${tot('lavage')} lavages attribués</span>
    <button class="btn ghost sm" onclick="BB.exportMatches()">${I('down',16)} Exporter</button>
  </div>
  <div class="card">
    <div class="tbl-wrap">
      <table class="recap">
        <thead><tr>
          <th class="mt">Match</th><th>RDV</th><th>Joueurs</th>
          <th>${I('car',14)} Transport</th><th>${I('cup',14)} Bar</th>
          <th>${I('shirt',14)} Maillots</th><th>Coachs</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <p class="tiny" style="margin-top:10px"><span class="only-tactile">Faites glisser le tableau horizontalement. </span>${COARSE?'Touchez':'Cliquez sur'} un adversaire pour ouvrir sa fiche.</p>`;
}
