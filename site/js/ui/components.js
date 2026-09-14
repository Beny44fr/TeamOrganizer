/* Composants d'interface partagés : feuilles de saisie, messages
   éphémères avec annulation, photographie de l'état. */
import {I} from '../core/icons.js';
import {$, S, save, setS, view} from '../core/state.js';
import {COARSE, esc} from '../core/utils.js';
import {migrate} from '../domain/model.js';
import {render} from '../screens/layout.js';

export function sheet(title,html,onOpen,opts){
  const ov=document.createElement('div');
  ov.className='ov';
  ov.innerHTML=`<div class="sheet"><div class="grab"></div>
    <div class="sheet-h"><h2>${esc(title)}</h2>
    <button class="btn sm ghost" data-x>${I('x',16)} Fermer</button></div>${html}</div>`;
  ov.addEventListener('click',e=>{
    if(e.target===ov||e.target.hasAttribute('data-x')||e.target.closest('[data-x]'))ov.remove();
  });
  ($||document.body).appendChild(ov);
  /* garde le champ actif visible quand le clavier s'ouvre */
  ov.addEventListener('focusin',e=>{
    if(!e.target.matches('input,select,textarea'))return;
    setTimeout(()=>{try{e.target.scrollIntoView({block:'center',behavior:'smooth'})}catch(_){}} ,260);
  });
  if(onOpen)onOpen(ov);
  /* Réflexes de boîte de dialogue au clavier : la première zone de saisie prend
     le focus, Ctrl+Entrée valide. Échap est géré globalement plus bas. */
  if(!COARSE)setTimeout(()=>{
    const f=ov.querySelector('.sheet input:not([type=file]):not([type=checkbox]):not([type=radio]):not([readonly]),.sheet textarea:not([readonly]),.sheet select');
    if(f)try{f.focus()}catch(e){}
  },40);
  ov.addEventListener('keydown',e=>{
    if(e.key!=='Enter'||!(e.ctrlKey||e.metaKey))return;
    const b=ov.querySelector('.sheet .btn.wide')||ov.querySelector('.sheet .btn:not(.ghost)');
    if(b){e.preventDefault();b.click()}
  });
  return ov;
}

/* Photographie de l'état, pour pouvoir revenir en arrière. */
export const snap=()=>JSON.stringify(S);

/* Copie un texte dans le presse-papiers par une zone de texte cachée, la
   méthode qui fonctionne partout, y compris sur les anciens iPhone. */
export function copyText(txt){
  const ta=document.createElement('textarea');ta.value=txt;
  ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);
  ta.select();try{document.execCommand('copy')}catch(e){}
  ta.remove();
}

export function toast(t,ic,undoJson){
  document.querySelectorAll('.toast').forEach(x=>x.remove());
  const d=document.createElement('div');d.className='toast';
  d.innerHTML=(ic?I(ic,17):'')+'<span>'+esc(t)+'</span>';
  if(undoJson){
    const b=document.createElement('button');
    b.className='tundo';b.type='button';
    b.innerHTML=I('undo',15)+' Annuler';
    b.onclick=()=>{
      let old;
      try{old=JSON.parse(undoJson)}catch(e){return}
      setS(old);migrate();save();
      d.remove();
      if(view.match&&!S.matches.some(m=>m.id===view.match))view.match=null;
      render();toast('Retour en arrière effectué','check');
    };
    d.appendChild(b);
  }
  ($||document.body).appendChild(d);
  setTimeout(()=>d.remove(),undoJson?8000:2200);
}
