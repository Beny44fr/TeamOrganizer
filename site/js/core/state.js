/* État de l'application et stockage local.
   S porte toutes les données (réglages, joueurs, coachs, matchs), view l'écran
   affiché. Un module ne peut pas réaffecter une variable importée : on passe
   par setS() et setView(), les lectures S.players… restent directes. */

const KEY='basket-referent-v1';

export const $=document.getElementById('app');

export let S=null, view={tab:'matchs',match:null,expP:null,expC:null}, mem={};

/* Stockage : API window.storage si la page tourne comme artefact Claude, sinon
   localStorage du navigateur, sinon mémoire volatile (stockage bloqué). */
const LS=(()=>{try{const k='__t';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch(e){return false}})();

export async function save(){
  const t=JSON.stringify(S);
  try{ if(window.storage&&window.storage.set){await window.storage.set(KEY,t);return} }catch(e){}
  try{ if(LS){localStorage.setItem(KEY,t);return} }catch(e){}
  mem[KEY]=t;
}

export async function load(){
  try{ if(window.storage&&window.storage.get){const r=await window.storage.get(KEY);if(r&&r.value)return JSON.parse(r.value)} }catch(e){}
  try{ if(LS){const v=localStorage.getItem(KEY);if(v)return JSON.parse(v)} }catch(e){}
  if(mem[KEY]){try{return JSON.parse(mem[KEY])}catch(e){}}
  return null;
}

export function setS(v){S=v}
export function setView(v){view=v}
