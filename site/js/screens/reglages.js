/* Réglages : équipe et salles, import et export, sauvegarde et
   restauration, modèles de message, remise à zéro. */
import {I} from '../core/icons.js';
import {S, save, setS, setView} from '../core/state.js';
import {aujourdhui, esc, toHM, toMin, uid} from '../core/utils.js';
import {buildIcs} from '../domain/agenda.js';
import {TPL_DOM, TPL_EXT} from '../domain/message.js';
import {byNom, coachName, contacts, migrate, pre, salles, sortedMatches, staffOf, times} from '../domain/model.js';
import {counts} from '../domain/roulements.js';
import {sheet, snap, toast} from '../ui/components.js';
import {download, dzHtml, loadXLSX, wireDrop} from '../ui/files.js';
import {applySalles, sRow} from '../ui/forms.js';
import {render} from './layout.js';

export function settingsView(){
  const s=S.settings;
  return `
  <div class="cols">
  <div class="col">
  <div class="card"><div class="card-h"><h3>L'équipe</h3></div><div class="card-b">
    <label class="f"><span>Nom de l'équipe</span><input id="s_eq" value="${esc(s.equipe)}"></label>
    <div class="f"><span>Salles à domicile</span>
      <div id="s_salles">${salles().map(x=>sRow(x)).join('')}</div>
      <button class="link" onclick="BB.addSalle()">${I('plus',16)} Ajouter une salle</button>
      <p class="tiny" style="margin-top:8px">La salle par défaut est présélectionnée pour les matchs à domicile et sert de point de départ des covoiturages. Renommer une salle met à jour les matchs concernés.</p>
    </div>
    <label class="f"><span>Être sur place combien de minutes avant le match</span>
      <input id="s_av" type="number" min="0" max="180" value="${s.avant}"></label>
    <label class="check" style="margin-bottom:14px"><input type="checkbox" id="s_ex"${s.exemptStaff?' checked':''}> Exempter les familles des coachs des roulements</label>
    <button class="btn wide" onclick="BB.saveSettings()">${I('check',18)} Enregistrer</button>
  </div></div>

  <div class="card"><div class="card-h"><h3>Import et export</h3></div><div class="card-b">
    <p class="muted" style="margin-bottom:12px">Le gabarit Excel contient deux onglets, Joueurs et Matchs, avec les bonnes colonnes.</p>
    <button class="btn ghost wide" style="margin-bottom:8px" onclick="BB.gabarit()">${I('file')} Télécharger le gabarit Excel</button>
    <div class="row">
      <button class="btn ghost" style="flex:1" onclick="BB.exportPlayers()">${I('down',17)} Joueurs</button>
      <button class="btn ghost" style="flex:1" onclick="BB.exportMatches()">${I('down',17)} Matchs</button>
    </div>
    <button class="btn ghost wide" style="margin-top:8px" onclick="BB.ics()">${I('ics')} Calendrier pour mon agenda (.ics)</button>
    <button class="btn ghost wide" style="margin-top:8px" onclick="BB.exportJson()">${I('save')} Sauvegarde complète (JSON)</button>
    <button class="btn ghost wide" style="margin-top:8px" onclick="BB.restore()">${I('up')} Restaurer une sauvegarde</button>
  </div></div>

  </div>
  <div class="col">
  <div class="card"><div class="card-h"><h3>Modèles de message</h3></div><div class="card-b">
    <p class="tiny" style="margin-bottom:11px">Variables : {equipe} {date} {heure} {adversaire} {salle} {adresse} {rdv} {arrivee} {depart} {trajet} {avant} {nb} {joueurs} {absents} {nbabs} {coachs} {transport} {bar} {lavage}</p>
    <label class="f"><span>Match à domicile</span><textarea id="s_td">${esc(s.tplDom)}</textarea></label>
    <label class="f"><span>Match à l'extérieur</span><textarea id="s_te">${esc(s.tplExt)}</textarea></label>
    <div class="row">
      <button class="btn" onclick="BB.saveTpl()">${I('check',17)} Enregistrer</button>
      <button class="btn ghost" onclick="BB.resetTpl()">Modèles d'origine</button>
    </div>
  </div></div>

  <div class="card"><div class="card-b">
    <button class="btn ghost wide" style="margin-bottom:8px" onclick="BB.guide()">${I('wand',17)} Revoir le guide de démarrage</button>
    <button class="btn danger wide" onclick="BB.wipe()">${I('trash',17)} Tout effacer</button>
  </div></div>
  </div></div>`;
}

export const reglagesActions={
 addSalle(){
   const box=document.querySelector('#s_salles'), d=document.createElement('div');
   d.innerHTML=sRow({id:uid(),nom:'',adresse:''});
   box.appendChild(d.firstElementChild);
   box.lastElementChild.querySelector('.s-nom').focus();
 },

 saveSettings(){
   const g=s=>document.querySelector(s).value.trim();
   const av=snap();
   const touches=applySalles(S.matches.some(m=>m.lieu==='domicile'));
   if(touches<0)return;
   S.settings.equipe=g('#s_eq');
   S.settings.avant=+g('#s_av')||45;
   S.settings.exemptStaff=document.querySelector('#s_ex').checked;
   save();render();toast('Réglages enregistrés','check',touches?av:null);
 },

 saveTpl(){
   S.settings.tplDom=document.querySelector('#s_td').value;
   S.settings.tplExt=document.querySelector('#s_te').value;
   save();toast('Modèles enregistrés','check');
 },

 resetTpl(){S.settings.tplDom=TPL_DOM;S.settings.tplExt=TPL_EXT;save();render();toast('Modèles réinitialisés')},

 wipe(){
   if(!confirm('Effacer tous les joueurs, coachs, matchs et roulements ?\n\nLes réglages, les salles et les modèles de message sont conservés.'))return;
   const av=snap();
   S.players=[];S.staff=[];S.matches=[];
   save();setView({tab:'joueurs',match:null,expP:null,expC:null});render();
   toast('Tout a été effacé','trash',av);
 },

 gabarit(){
   loadXLSX().then(X=>{
     const wb=X.utils.book_new();
     const notice=[['Gabarit d\u2019import — gestion de l\u2019équipe'],[],
       ['Remplissez l\u2019onglet Joueurs et/ou l\u2019onglet Matchs, une ligne par élément.'],
       ['Supprimez les lignes d\u2019exemple avant l\u2019import.'],
       ['Ne déplacez pas les colonnes et n\u2019en insérez pas.'],[],
       ['Joueurs — Coach ? : mettez x si un parent du joueur est coach.'],
       ['Joueurs — Mails : plusieurs adresses séparées par une virgule.'],[],
       ['Matchs — Date : jj/mm/aaaa. Heure : 14h00 ou 14:00.'],
       ['Matchs — Lieu : D pour domicile, E pour extérieur.'],
       ['Matchs — Salle à domicile : '+(salles().map(x=>x.nom).join(', ')||'le nom que vous utiliserez, il sera créé à l’import')+'.'],
       ['Matchs — Trajet : laissez vide, il sera estimé automatiquement.']];
     const joueurs=[['Nom','Prénom','Coach ?','Licence','Année naissance','Sexe','Commune','Mails','Tél 1','Tél 2','Tél 3'],
       ['DUPONT','Léo','','BC123456','2014','M','GENESTON','sophie.dupont@mail.fr, marc.dupont@mail.fr','06 11 22 33 44','02 40 00 00 00',''],
       ['MARTIN','Noa','x','BC654321','2015','M','MONTBERT','famille.martin@mail.fr','06 55 66 77 88','','']];
     const matchs=[['Date','Heure','Adversaire','Lieu (D ou E)','Salle','Adresse','Trajet aller (min)'],
       ['14/09/2026','14h00','BC Vertou','E','Salle du Loiry','Rue du Loiry, Vertou',''],
       ['21/09/2026','16h30','Aigrefeuille BC','D','Montbert','','']];
     const s1=X.utils.aoa_to_sheet(notice); s1['!cols']=[{wch:96}];
     const s2=X.utils.aoa_to_sheet(joueurs); s2['!cols']=[18,14,9,13,15,7,20,44,16,16,16].map(w=>({wch:w}));
     const s3=X.utils.aoa_to_sheet(matchs); s3['!cols']=[13,10,26,13,26,34,17].map(w=>({wch:w}));
     X.utils.book_append_sheet(wb,s1,'Notice');
     X.utils.book_append_sheet(wb,s2,'Joueurs');
     X.utils.book_append_sheet(wb,s3,'Matchs');
     X.writeFile(wb,'gabarit-import-equipe.xlsx');
     toast('Gabarit téléchargé','check');
   }).catch(()=>toast('Téléchargement impossible hors ligne'));
 },

 exportPlayers(){
   loadXLSX().then(X=>{
     const head=['Nom','Prénom','Coach ?','Licence','Année naissance','Sexe','Commune','Mails','Tél 1','Tél 2','Tél 3'];
     const rows=[...S.players].sort(byNom).map(p=>{
       const t=contacts(p.tels);
       return [p.nom,p.prenom,(p.coach||staffOf(p.id).length)?'x':'',p.licence,p.annee,p.sexe,p.commune,
         contacts(p.mails).map(x=>x.value).join(', '),
         (t[0]||{}).value||'',(t[1]||{}).value||'',(t[2]||{}).value||''];
     });
     const coach=[[],['Coachs'],['Nom','Prénom','','Licence','Année','','Commune','Mails','Tél 1','Tél 2','Tél 3']]
       .concat(S.staff.map(s=>{
         const t=contacts(s.tels);
         return [s.nom,s.prenom,'',s.licence||'',s.annee||'','',s.commune||'',
           contacts(s.mails).map(x=>x.value).join(', '),(t[0]||{}).value||'',(t[1]||{}).value||'',(t[2]||{}).value||''];
       }));
     const ws=X.utils.aoa_to_sheet([head].concat(rows,coach));
     ws['!cols']=[18,14,9,13,15,7,20,44,16,16,16].map(w=>({wch:w}));
     const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Joueurs');
     X.writeFile(wb,'effectif-'+(S.settings.equipe||'equipe').replace(/\W+/g,'-')+'.xlsx');
     toast('Effectif exporté','check');
   }).catch(()=>toast('Export impossible hors ligne'));
 },

 exportMatches(){
   loadXLSX().then(X=>{
     const head=['Date','Heure','Adversaire','Lieu','Salle','Adresse','Départ de','Trajet (min)',
                 'RDV','Arrivée','Coachs','Convoqués','Transport','Bar','Maillots'];
     const rows=sortedMatches().map(m=>{
       const t=times(m), nm=a=>(a||[]).map(id=>pre(id)).join(', ');
       const d=new Date(m.date+'T12:00:00');
       return [isNaN(d)?m.date:d.toLocaleDateString('fr-FR'),toHM(toMin(m.heure)),m.adversaire,
         m.lieu==='domicile'?'Domicile':'Extérieur',m.salle||'',m.adresse||'',m.depart||'',m.trajet||'',
         toHM(t.rdv),toHM(t.arrivee),(m.staff||[]).map(id=>coachName(id)).join(', '),
         nm(m.convoques),nm(m.transport),nm(m.bar),nm(m.lavage)];
     });
     const c=counts(null);
     const eq=[[],['Équité — cumul par famille'],['Joueur','Transport','Bar','Maillots','Total','Convocations']]
       .concat([...S.players].sort(byNom)
         .map(p=>[p.prenom+' '+p.nom,c[p.id].transport,c[p.id].bar,c[p.id].lavage,c[p.id].total,c[p.id].convocs]));
     const ws=X.utils.aoa_to_sheet([head].concat(rows,eq));
     ws['!cols']=[12,8,24,12,24,30,14,11,9,9,22,40,26,26,20].map(w=>({wch:w}));
     const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Matchs');
     X.writeFile(wb,'calendrier-'+(S.settings.equipe||'equipe').replace(/\W+/g,'-')+'.xlsx');
     toast('Calendrier exporté','check');
   }).catch(()=>toast('Export impossible hors ligne'));
 },

 ics(id){
   const list=id?[S.matches.find(x=>x.id===id)]:sortedMatches();
   if(!list.length||!list[0]){toast('Aucun match');return}
   const txt=buildIcs(list);
   if(!txt.includes('BEGIN:VEVENT')){toast('Date ou heure manquante');return}
   try{
     download(id?'match-'+(list[0].date||'')+'.ics':'calendrier-'+(S.settings.equipe||'equipe').replace(/\W+/g,'-')+'.ics',
              txt,'text/calendar;charset=utf-8');
     toast(id?'Événement téléchargé':'Calendrier téléchargé','check');
   }catch(e){toast('Téléchargement impossible')}
 },

 exportJson(){
   const t=JSON.stringify(S,null,2);
   try{
     const d=aujourdhui();
     download('sauvegarde-equipe-'+d+'.json',t,'application/json');
     toast('Sauvegarde téléchargée','check');
   }catch(e){
     sheet('Sauvegarde',`<div class="card"><div class="card-b">
       <p class="muted" style="margin-bottom:10px">Copiez ce texte et conservez-le.</p>
       <label class="f"><textarea readonly style="min-height:240px">${esc(t)}</textarea></label></div></div>`);
   }
 },

 restore(){
   sheet('Restaurer une sauvegarde',`
   <div class="card"><div class="card-b">
     <div class="warn" style="margin-top:0;margin-bottom:14px">La restauration remplace intégralement les joueurs, coachs, matchs, roulements et réglages actuels. Exportez d'abord une sauvegarde si vous avez un doute.</div>
     ${dzHtml('dz_r','Fichier .json exporté depuis cet outil','.json,application/json')}
     <label class="f" style="margin-top:14px"><span>Ou collez le contenu de la sauvegarde</span>
       <textarea id="r_t" placeholder='{"settings":{...},"players":[...]}'></textarea></label>
     <button class="btn danger wide" id="r_ok">${I('save',17)} Restaurer</button>
   </div></div>`,ov=>{
     let brut=null;
     const dz=ov.querySelector('#dz_r');
     const lire=fi=>{
       if(!fi)return;
       const fr=new FileReader();
       fr.onload=()=>{brut=String(fr.result);dz.querySelector('.dzt').textContent=fi.name+' — prêt à restaurer'};
       fr.onerror=()=>dz.querySelector('.dzt').textContent='Fichier illisible';
       fr.readAsText(fi,'utf-8');
     };
     wireDrop(dz,lire);
     ov.querySelector('#r_ok').onclick=()=>{
       const txt=(brut||ov.querySelector('#r_t').value||'').trim();
       if(!txt){toast('Aucune sauvegarde fournie');return}
       let d;
       try{d=JSON.parse(txt)}catch(e){toast('Fichier illisible : ce n\u2019est pas du JSON valide');return}
       if(!d||typeof d!=='object'||!Array.isArray(d.players)||!Array.isArray(d.matches)){
         toast('Ce fichier n\u2019est pas une sauvegarde de l\u2019outil');return;
       }
       if(!confirm('Restaurer '+d.players.length+' joueur(s) et '+d.matches.length+' match(s) ?\n\nLes données actuelles seront remplacées.'))return;
       const av=snap();
       setS(d);migrate();save();
       setView({tab:'matchs',match:null,expP:null,expC:null});
       ov.remove();render();
       toast('Sauvegarde restaurée','check',av);
     };
   });
 },
};
