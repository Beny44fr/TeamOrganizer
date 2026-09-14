/* Premier démarrage : parcours guidé en trois étapes — l'équipe, les
   matchs, les salles. */
import {I} from '../core/icons.js';
import {$, S, save, setView} from '../core/state.js';
import {esc} from '../core/utils.js';
import {salles} from '../domain/model.js';
import {toast} from '../ui/components.js';
import {applySalles, sRow} from '../ui/forms.js';
import {render} from './layout.js';

/* Trois étapes, dans l'ordre où l'on constitue une équipe : l'effectif, le
   calendrier, puis les salles. Chacune réutilise les écrans de saisie normaux
   plutôt que d'en dupliquer. L'étape courante vit dans les réglages : fermer
   l'onglet en cours de route ne la perd pas. */
const obStep=()=>Math.min(3,Math.max(1,+S.settings.onboarding||1));

export function onboardingView(){
  const st=obStep(), s=S.settings;
  const nbJ=S.players.length, nbC=S.staff.length, nbM=S.matches.length;
  const bar=[1,2,3].map(i=>`<i class="${i<st?'done':(i===st?'on':'')}"></i>`).join('');
  const fait=t=>`<div class="ob-done">${I('check',17)}<span>${t}</span></div>`;

  const corps={
   1:`
     <div class="ob-lbl">Étape 1 sur 3</div>
     <h2>Votre équipe</h2>
     <p class="lead">Nommez l'équipe, puis constituez l'effectif : joueur par joueur,
       en important un fichier Excel, ou en repartant d'une sauvegarde de l'outil.</p>
     <div class="card" style="margin-top:18px"><div class="card-b">
       <label class="f"><span>Nom de l'équipe</span>
         <input id="ob_eq" value="${esc(s.equipe||'')}" placeholder="U13 M"></label>
       ${nbJ?fait(`<b>${nbJ} joueur${nbJ>1?'s':''}</b>${nbC?' et '+nbC+' coach'+(nbC>1?'s':''):''} dans l\u2019effectif.`):''}
       <div class="row">
         <button class="btn" style="flex:1" onclick="BB.editPlayer()">${I('plus')} Ajouter un joueur</button>
         <button class="btn ghost" onclick="BB.importPlayers()">${I('up')} Importer</button>
       </div>
       <button class="btn ghost wide" style="margin-top:8px" onclick="BB.editStaff()">${I('board',17)} Ajouter un coach</button>
       <button class="btn ghost wide" style="margin-top:8px" onclick="BB.restore()">${I('save',17)} Restaurer une sauvegarde</button>
       <p class="tiny" style="margin-top:12px">Les familles des coachs peuvent être exemptées des roulements : rattachez le coach à son joueur au moment de le créer.</p>
     </div></div>`,
   2:`
     <div class="ob-lbl">Étape 2 sur 3</div>
     <h2>Les matchs</h2>
     <p class="lead">Saisissez le calendrier de la saison. L'import Excel va plus vite
       si vous avez reçu la liste des rencontres ; sinon ajoutez les matchs au fil de l'eau.</p>
     <div class="card" style="margin-top:18px"><div class="card-b">
       ${nbM?fait(`<b>${nbM} match${nbM>1?'s':''}</b> au calendrier.`):''}
       <div class="row">
         <button class="btn" style="flex:1" onclick="BB.editMatch()">${I('plus')} Ajouter un match</button>
         <button class="btn ghost" onclick="BB.importMatches()">${I('up')} Importer</button>
       </div>
       <button class="btn ghost wide" style="margin-top:8px" onclick="BB.gabarit()">${I('file',17)} Télécharger le gabarit Excel</button>
       <p class="tiny" style="margin-top:12px">La salle indiquée pour un match à domicile est enregistrée au passage : vous la retrouverez à l'étape suivante, où il ne restera qu'à compléter son adresse.</p>
     </div></div>`,
   3:`
     <div class="ob-lbl">Étape 3 sur 3</div>
     <h2>Vos salles</h2>
     <p class="lead">Les salles où l'équipe reçoit, qui servent aussi de points de
       départ aux covoiturages. L'adresse sert à estimer les temps de trajet.</p>
     <div class="card" style="margin-top:18px"><div class="card-b">
       <div class="f"><span>Salles à domicile</span>
         <div id="s_salles">${salles().map(x=>sRow(x)).join('')}</div>
         <button class="link" onclick="BB.addSalle()">${I('plus',16)} Ajouter une salle</button>
         ${salles().length?'':'<p class="tiny" style="margin-top:8px">Aucune salle pour l\u2019instant. Si votre équipe joue toujours à l\u2019extérieur, passez cette étape.</p>'}
       </div>
       <label class="f"><span>Être sur place combien de minutes avant le match</span>
         <input id="s_av" type="number" min="0" max="180" value="${esc(s.avant)}"></label>
       <label class="check"><input type="checkbox" id="s_ex"${s.exemptStaff?' checked':''}> Exempter les familles des coachs des roulements</label>
     </div></div>`
  }[st];

  $.innerHTML=`
  <main class="wrap"><div class="ob">
    <header class="top" style="padding:20px 0 16px">
      <h1>Bienvenue</h1>
      <div class="sub">Mise en route de l'outil, en trois étapes</div>
    </header>
    <div class="ob-steps">${bar}</div>
    ${corps}
    <div class="ob-nav">
      ${st>1?`<button class="btn ghost back" onclick="BB.obBack()">${I('back',17)} Retour</button>`:''}
      <button class="btn" onclick="BB.obNext()">${st<3?'Continuer':I('check',18)+' Terminer'}</button>
    </div>
    <p style="text-align:center;margin-top:12px">
      <button class="link subtle" onclick="BB.obSkip()">Passer et aller à l'application</button></p>
  </div></main>`;
}

export const onboardingActions={
 obNext(){
   const st=obStep(), eq=document.querySelector('#ob_eq');
   if(eq)S.settings.equipe=eq.value.trim();
   if(st<3){S.settings.onboarding=st+1;save();render();window.scrollTo(0,0);return}
   if(applySalles(false)<0)return;
   const av=document.querySelector('#s_av'), ex=document.querySelector('#s_ex');
   if(av)S.settings.avant=+av.value||45;
   if(ex)S.settings.exemptStaff=ex.checked;
   this.obSkip('Tout est prêt');
 },

 obBack(){
   const st=obStep();
   if(st<=1)return;
   if(st===3&&applySalles(false)<0)return;
   S.settings.onboarding=st-1;save();render();window.scrollTo(0,0);
 },

 obSkip(msg){
   const eq=document.querySelector('#ob_eq');
   if(eq)S.settings.equipe=eq.value.trim();
   S.settings.onboarding=0;save();
   setView({tab:S.matches.length?'matchs':'joueurs',match:null,expP:null,expC:null});
   render();window.scrollTo(0,0);
   if(typeof msg==='string')toast(msg,'check');
 },

 /* Revoir le guide sans rien effacer, les données sont conservées. */
 guide(){S.settings.onboarding=1;save();render();window.scrollTo(0,0)},
};
