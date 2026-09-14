/* Squelette de l'application : en-tête, barre d'onglets, aiguillage vers
   l'écran courant. */
import {I} from '../core/icons.js';
import {$, S, view} from '../core/state.js';
import {esc} from '../core/utils.js';
import {todo} from '../domain/model.js';
import {playersView} from './effectif.js';
import {equityView} from './equite.js';
import {matchDetail, matchList} from './matchs.js';
import {onboardingView} from './onboarding.js';
import {recapView} from './recap.js';
import {settingsView} from './reglages.js';

export function render(){
  if(S.settings.onboarding){onboardingView();return}
  const y=window.scrollY, n=todo();
  const tabs=[['matchs','Matchs','cal',n],['joueurs','Effectif','users',0],
              ['recap','Récap','board',0],['equite','Équité','scale',0],['reglages','Réglages','gear',0]];
  const titre={matchs:'Calendrier',joueurs:'Effectif',recap:'Qui fait quoi',
               equite:'Équité',reglages:'Réglages'}[view.tab];
  $.innerHTML=`
  <header class="top">
    <h1>${esc(titre)}</h1>
    <div class="sub">${esc(S.settings.equipe||'Mon équipe')} · ${S.players.filter(p=>p.actif).length} joueurs${S.staff.length?' · '+S.staff.length+' coach'+(S.staff.length>1?'s':''):''}</div>
  </header>
  <nav class="tabbar" role="tablist">
    ${tabs.map(t=>`<button class="tab" role="tab" aria-selected="${view.tab===t[0]}" onclick="BB.go('${t[0]}')">
      ${I(t[2],21)}<span>${t[1]}</span>${t[3]?`<span class="bdg">${t[3]}</span>`:''}</button>`).join('')}
  </nav>
  <main class="wrap">${
    view.tab==='matchs'?(view.match?matchDetail():matchList()):
    view.tab==='joueurs'?playersView():
    view.tab==='recap'?recapView():
    view.tab==='equite'?equityView():settingsView()
  }</main>`;
  window.scrollTo(0,y);
}

export function go(t){view.tab=t;view.match=null;render();window.scrollTo(0,0)}
