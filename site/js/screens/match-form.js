/* Formulaire de création et de modification d'un match, avec
   l'estimation du trajet et le choix de la salle de départ. */
import {I} from '../core/icons.js';
import {S, save, view} from '../core/state.js';
import {esc, normHeure, toHM, toMin, uid} from '../core/utils.js';
import {registerSalle, salleAdr, salles} from '../domain/model.js';
import {estimTrajet, mapsUrl} from '../domain/trajets.js';
import {sheet, toast} from '../ui/components.js';
import {salleField} from '../ui/forms.js';
import {render} from './layout.js';

export const matchFormActions={
 editMatch(id){
   const def=S.settings.salleDef;
   const m=id?S.matches.find(x=>x.id===id)
             :{date:'',heure:'',adversaire:'',lieu:'domicile',salle:def,adresse:salleAdr(def),depart:def,trajet:''};
   const dom=m.lieu==='domicile';
   sheet(id?'Modifier le match':'Nouveau match',`
     <div class="card"><div class="card-b">
       <div class="grid2">
         <label class="f"><span>Date</span><input id="m_d" type="date" value="${esc(m.date)}"></label>
         <label class="f"><span>Heure du match</span><input id="m_h" type="time" step="300" value="${esc(normHeure(m.heure))}"></label>
       </div>
       <label class="f"><span>Adversaire</span><input id="m_a" value="${esc(m.adversaire)}" placeholder="BC Vertou"></label>
       <div class="f"><span>Lieu</span>
         <div class="seg lieu" id="m_seg">
           <button type="button" data-v="domicile" aria-pressed="${dom}">${I('home',17)} À domicile</button>
           <button type="button" data-v="exterieur" aria-pressed="${!dom}">${I('car',17)} À l'extérieur</button>
         </div>
       </div>
       <div id="m_bdom" style="${dom?'':'display:none'}">
         <label class="f"><span>Salle qui reçoit</span>${salleField('m_ss',dom?m.salle:def,'Nom de votre salle')}</label>
       </div>
       <div id="m_bext" style="${dom?'display:none':''}">
         <label class="f"><span>Adresse du match — sert au calcul du trajet</span>
           <input id="m_ad" value="${esc(dom?'':(m.adresse||''))}" placeholder="Rue du Loiry, 44120 Vertou"></label>
         <label class="f"><span>Salle de l'adversaire</span><input id="m_s" value="${esc(dom?'':(m.salle||''))}" placeholder="Salle du Loiry"></label>
         <label class="f"><span>Départ groupé depuis</span>${salleField('m_dp',m.depart||def,'Nom de votre salle')}</label>
         <div id="m_hint"></div>
         <label class="f" style="margin-bottom:4px"><span>Trajet aller (min)</span>
           <input id="m_t" type="number" min="0" step="5" value="${m.trajet||''}" placeholder="—"></label>
         <div class="row" style="gap:16px;margin-bottom:14px">
           <button class="link subtle" id="m_est">${I('refresh',15)} Recalculer</button>
           <button class="link subtle" id="m_map">${I('map',15)} Google Maps</button>
         </div>
       </div>
       <button class="btn wide" id="m_ok">${id?'Enregistrer':'Ajouter le match'}</button>
     </div></div>`,ov=>{
       const q=s=>ov.querySelector(s);
       const lieuVal=()=>q('#m_seg button[aria-pressed="true"]').dataset.v;
       q('#m_seg').querySelectorAll('button').forEach(b=>{
         b.onclick=()=>{
           q('#m_seg').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
           const d=b.dataset.v==='domicile';
           q('#m_bdom').style.display=d?'':'none';
           q('#m_bext').style.display=d?'none':'';
           if(!d)propose(false);
         };
       });
       let depTouched=!!id;   /* sur un match existant, on respecte le départ enregistré */
       function propose(force){
         const dest=q('#m_ad').value.trim();
         if(!dest){
           q('#m_hint').innerHTML=force?'<div class="warn">Renseignez l\u2019adresse du match pour estimer le trajet.</div>':'';
           return;
         }
         /* on estime le trajet depuis chacune des salles à domicile ; sans salle
            enregistrée, depuis le point de départ tapé à la main */
         const src=salles().length?salles().map(x=>x.nom):[q('#m_dp').value.trim()].filter(Boolean);
         const opts=src.map(nom=>({nom:nom,e:estimTrajet(nom,dest,id)}))
                       .filter(o=>o.e).sort((a,b)=>a.e.min-b.e.min);
         if(!opts.length){
           q('#m_hint').innerHTML=force?'<div class="warn">Commune non reconnue dans l\u2019adresse, saisissez la durée du trajet à la main.</div>':'';
           return;
         }
         const best=opts[0];
         if((force||!depTouched)&&q('#m_dp').value!==best.nom)q('#m_dp').value=best.nom;
         const cur=opts.find(o=>o.nom===q('#m_dp').value)||best;
         if(force||!q('#m_t').value)q('#m_t').value=cur.e.min;
         const h=toMin(q('#m_h').value), av=+S.settings.avant||45;
         const dep=h==null?null:h-av-cur.e.min;
         const others=opts.filter(o=>o.nom!==cur.nom);
         const meilleur=cur.nom===best.nom;
         q('#m_hint').innerHTML=`
           <div class="hintbox${meilleur?'':' alt'}">
             ${I('route',17)}
             <div style="flex:1;min-width:0">
               <b>${meilleur?'Départ conseillé':'Trajet depuis'} : ${esc(cur.nom)} — ${cur.e.min} min</b>
               <div class="sub">${esc(cur.e.why)}${dep!=null?' · départ à '+toHM(dep)+' pour être sur place '+av+' min avant':''}</div>
               ${others.length?`<div class="sub alts">${others.map(o=>esc(o.nom)+' '+o.e.min+' min').join(' · ')}</div>`:''}
               ${meilleur?'':`<button class="btn sm ghost" id="m_use" style="margin-top:9px">${I('check',15)} Partir plutôt de ${esc(best.nom)} (${best.e.min} min)</button>`}
             </div>
           </div>`;
         const u=q('#m_use');
         if(u)u.onclick=e2=>{e2.preventDefault();q('#m_dp').value=best.nom;depTouched=true;propose(true)};
       }
       q('#m_est').onclick=e=>{e.preventDefault();propose(true)};
       q('#m_map').onclick=e=>{
         e.preventDefault();
         const u=mapsUrl({lieu:lieuVal(),adresse:q('#m_ad').value.trim(),
                          salle:q('#m_s').value.trim(),depart:q('#m_dp').value});
         if(!u){toast('Renseignez l\u2019adresse du match');return}
         window.open(u,'_blank');
       };
       q('#m_ad').addEventListener('change',()=>propose(false));
       q('#m_dp').addEventListener('change',()=>{depTouched=true;propose(true)});
       q('#m_h').addEventListener('change',()=>{if(lieuVal()!=='domicile')propose(false)});
       if(!dom)propose(false);
       q('#m_ok').onclick=()=>{
         const g=s=>q(s).value.trim(), d=lieuVal()==='domicile';
         if(!g('#m_d')||!g('#m_h')){toast('Date et heure obligatoires');return}
         /* une salle saisie librement rejoint les réglages */
         const sd=registerSalle(d?g('#m_ss'):g('#m_dp'));
         const o=d?{date:g('#m_d'),heure:normHeure(g('#m_h')),adversaire:g('#m_a'),lieu:'domicile',
                    salle:sd,adresse:salleAdr(sd),depart:sd,trajet:0}
                 :{date:g('#m_d'),heure:normHeure(g('#m_h')),adversaire:g('#m_a'),lieu:'exterieur',
                    salle:g('#m_s'),adresse:g('#m_ad'),depart:sd,trajet:+g('#m_t')||0};
         if(id)Object.assign(S.matches.find(x=>x.id===id),o);
         else{
           const nm=Object.assign({id:uid(),convoques:[],transport:[],bar:[],lavage:[],staff:S.staff.map(x=>x.id)},o);
           S.matches.push(nm);
           /* on ouvre directement la fiche du match créé */
           view.tab='matchs';view.match=nm.id;
         }
         save();ov.remove();render();
         if(!id){window.scrollTo(0,0);toast('Match créé, à vous les convocations','check')}
       };
     });
 },
};
