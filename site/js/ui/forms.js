/* Gabarits de saisie réutilisés par plusieurs écrans : lignes de contact,
   champs et lignes de salle. */
import {I} from '../core/icons.js';
import {S} from '../core/state.js';
import {esc, uid} from '../core/utils.js';
import {autoLabel, salles} from '../domain/model.js';
import {toast} from './components.js';

export function cRow(kind,label,value){
  return `<div class="crow">
    <input class="lb" placeholder="${kind==='tel'?'Papa':'Maman'}" value="${esc(label||'')}">
    <input class="vl" inputmode="${kind==='tel'?'tel':'email'}" placeholder="${kind==='tel'?'06 12 34 56 78':'adresse@mail.fr'}" value="${esc(value||'')}">
  </div>`;
}
/* Lignes de contact d'une fiche : ajout d'une ligne vide, curseur sur le
   libellé ; lecture des lignes remplies, un libellé vide recevant un libellé
   par défaut (Tél 1, Parent 1…). */
export function addContactRow(box,kind){
  const d=document.createElement('div');
  d.innerHTML=cRow(kind,'','');box.appendChild(d.firstElementChild);
  box.lastElementChild.querySelector('.lb').focus();
}
export function readContactRows(box,kind){
  return [...box.querySelectorAll('.crow')]
    .map(r=>({label:r.querySelector('.lb').value.trim(),value:r.querySelector('.vl').value.trim()}))
    .filter(x=>x.value).map((x,i)=>({label:x.label||autoLabel(x.value,i,kind),value:x.value}));
}

function salleOpts(sel){
  const l=salles().map(s=>s.nom);
  if(sel&&!l.includes(sel))l.unshift(sel);
  return l.map(n=>`<option${n===sel?' selected':''}>${esc(n)}</option>`).join('');
}

/* Tant qu'aucune salle n'est enregistrée — la toute première saisie — le champ
   est libre plutôt qu'une liste vide : le nom tapé rejoint les réglages au
   moment d'enregistrer. L'ordre du parcours de démarrage reste donc libre. */
export function salleField(id,sel,ph){
  return salles().length
    ? `<select id="${id}">${salleOpts(sel)}</select>`
    : `<input id="${id}" value="${esc(sel||'')}" placeholder="${esc(ph||'Nom de la salle')}">`;
}

function salleUsage(nom){
  let dom=0,dep=0;
  S.matches.forEach(m=>{
    if(m.lieu==='domicile'&&m.salle===nom)dom++;
    else if(m.lieu==='exterieur'&&m.depart===nom)dep++;
  });
  return {dom,dep,total:dom+dep};
}

export function sRow(sa){
  sa=sa||{id:'',nom:'',adresse:''};
  const u=sa.nom?salleUsage(sa.nom):{dom:0,dep:0,total:0};
  const parts=[];
  if(u.dom)parts.push(u.dom+' match'+(u.dom>1?'s':'')+' à domicile');
  if(u.dep)parts.push(u.dep+' départ'+(u.dep>1?'s':''));
  return `<div class="salle" data-id="${esc(sa.id||uid())}" data-nom="${esc(sa.nom||'')}">
    <div class="s-top">
      <input class="s-nom" placeholder="Nom de la salle" value="${esc(sa.nom||'')}">
      <button class="btn ghost s-del" title="Retirer cette salle">${I('trash',16)}</button>
    </div>
    <input class="s-adr" placeholder="Adresse (facultatif)" value="${esc(sa.adresse||'')}">
    <div class="s-bot">
      <label class="s-def"><input type="radio" name="sdef" value="${esc(sa.nom||'')}"${S.settings.salleDef===sa.nom?' checked':''}> Salle par défaut</label>
      <span class="tiny">${parts.length?esc(parts.join(' · ')):'jamais utilisée'}</span>
    </div>
  </div>`;
}

/* Applique au modèle les lignes de salles saisies dans #s_salles : renommages et
   suppressions sont répercutés sur les matchs concernés. Renvoie le nombre de
   matchs déplacés, ou -1 si la saisie est refusée ou la confirmation annulée. */
export function applySalles(minUne){
  const box=document.querySelector('#s_salles');
  if(!box)return 0;
  const rows=[...box.querySelectorAll('.salle')].map(r=>({
    id:r.dataset.id, ancien:r.dataset.nom||'',
    nom:r.querySelector('.s-nom').value.trim(),
    adresse:r.querySelector('.s-adr').value.trim(),
    def:r.querySelector('.s-def input').checked
  })).filter(x=>x.nom);
  if(minUne&&!rows.length){toast('Gardez au moins une salle : des matchs se jouent à domicile');return -1}
  const vus=new Set();
  for(const r of rows){
    const k=r.nom.toLowerCase();
    if(vus.has(k)){toast('Deux salles portent le même nom');return -1}
    vus.add(k);
  }
  const defNom=rows.length?(rows.find(r=>r.def)||rows[0]).nom:'';
  /* salles retirées : on prévient si des matchs les utilisent */
  const gardees=new Set(rows.map(r=>r.id));
  const retirees=salles().filter(x=>!gardees.has(x.id));
  const touches=new Set();
  retirees.forEach(x=>S.matches.forEach(m=>{if(m.salle===x.nom||m.depart===x.nom)touches.add(m.id)}));
  if(touches.size&&!confirm(touches.size+' match'+(touches.size>1?'s utilisent':' utilise')+
     ' une salle que vous supprimez.\n\n'+(defNom?'Les basculer sur '+defNom+' ?':'Les laisser sans salle ?')))return -1;
  /* renommages, repérés par identifiant */
  rows.forEach(r=>{
    if(r.ancien&&r.ancien!==r.nom)S.matches.forEach(m=>{
      if(m.salle===r.ancien)m.salle=r.nom;
      if(m.depart===r.ancien)m.depart=r.nom;
    });
  });
  retirees.forEach(x=>S.matches.forEach(m=>{
    if(m.salle===x.nom)m.salle=defNom;
    if(m.depart===x.nom)m.depart=defNom;
  }));
  S.settings.salles=rows.map(r=>({id:r.id,nom:r.nom,adresse:r.adresse}));
  S.settings.salleDef=defNom;
  /* l'adresse d'une salle suit sur les matchs à domicile qui s'y jouent */
  rows.forEach(r=>S.matches.forEach(m=>{if(m.lieu==='domicile'&&m.salle===r.nom)m.adresse=r.adresse}));
  return touches.size;
}
