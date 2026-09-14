/* Point d'entrée. Assemble les actions de chaque écran dans l'objet BB,
   appelé depuis les attributs onclick du HTML généré, installe les
   écouteurs globaux, puis charge les données et affiche l'application. */
import {load, S, save, setS} from './core/state.js';
import {blank, migrate} from './domain/model.js';
import {toast} from './ui/components.js';
import {loadXLSX} from './ui/files.js';
import {effectifActions} from './screens/effectif.js';
import {go, render} from './screens/layout.js';
import {matchFormActions} from './screens/match-form.js';
import {matchActions} from './screens/matchs.js';
import {onboardingActions} from './screens/onboarding.js';
import {planActions} from './screens/planification.js';
import {reglagesActions} from './screens/reglages.js';

const BB=Object.assign({go},
  onboardingActions, matchActions, matchFormActions, planActions,
  effectifActions, reglagesActions);
window.BB=BB;

/* Échap ferme la feuille ouverte la plus récente. */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const l=document.querySelectorAll('.ov');
  if(!l.length)return;
  e.preventDefault();
  l[l.length-1].remove();
});

/* Suppression d'une ligne de salle, dans les réglages comme au premier
   démarrage : au moins une salle reste exigée si des matchs se jouent à domicile. */
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('.s-del');
  if(!b)return;
  e.preventDefault();
  const box=document.querySelector('#s_salles');
  if(box&&box.querySelectorAll('.salle').length<=1&&S.matches.some(m=>m.lieu==='domicile')){
    toast('Gardez au moins une salle : des matchs se jouent à domicile');return;
  }
  const li=b.closest('.salle'), etaitDef=li.querySelector('.s-def input').checked;
  li.remove();
  if(etaitDef&&box){
    const r=box.querySelector('.s-def input');
    if(r)r.checked=true;
  }
});

/* démarrage */
(async function(){
  setS(await load());
  if(!S)setS(blank());
  migrate();
  await save();
  render();
  loadXLSX().catch(()=>{});
})();
