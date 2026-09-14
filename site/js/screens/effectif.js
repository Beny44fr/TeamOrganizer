/* Effectif : joueurs et coachs, fiches de saisie, import de joueurs,
   récupération des numéros pour un groupe WhatsApp. */
import {I} from '../core/icons.js';
import {S, save, view} from '../core/state.js';
import {esc, tap, uid} from '../core/utils.js';
import {byNom, coachName, contacts, full, importTeam, initials, isTeamFile, normContacts, P, pruneRefs, ST, staffName, staffOf} from '../domain/model.js';
import {copyText, sheet, snap, toast} from '../ui/components.js';
import {dropZone, dzHtml, splitLines} from '../ui/files.js';
import {addContactRow, cRow, readContactRows} from '../ui/forms.js';
import {render} from './layout.js';

function contactLines(p){
  const out=[];
  contacts(p.tels).forEach(t=>out.push(`<div class="ct"><b>${esc(t.label||'Tél')}</b><a href="tel:${esc(String(t.value).replace(/\s/g,''))}">${esc(t.value)}</a></div>`));
  contacts(p.mails).forEach(t=>out.push(`<div class="ct"><b>${esc(t.label||'Mail')}</b><a href="mailto:${esc(t.value)}">${esc(t.value)}</a></div>`));
  return out.length?`<div class="ctl">${out.join('')}</div>`:'<div class="tiny">Aucun contact enregistré</div>';
}

export function playersView(){
  const list=[...S.players].sort(byNom);
  const rows=list.map(p=>{
    const open=view.expP===p.id, nb=contacts(p.tels).length+contacts(p.mails).length;
    return `<button class="prow" onclick="BB.expP('${p.id}')">
      <span class="avatar">${esc(initials(p))}</span>
      <span class="grow">
        <span class="name">${esc(p.prenom)} ${esc(p.nom)} ${(p.coach||staffOf(p.id).length)?'<span class="pill coach">coach</span>':''}${p.actif?'':'<span class="pill off">inactif</span>'}</span>
        <span class="meta" style="display:block">${[p.annee,p.commune].filter(Boolean).map(esc).join(' · ')} · ${nb} contact${nb>1?'s':''}</span>
      </span>
      <span class="chev${open?' open':''}">${I('chev',18)}</span>
    </button>
    ${open?`<div class="panel">${contactLines(p)}
      <div class="row" style="margin-top:10px">
        <button class="btn sm ghost" onclick="BB.editPlayer('${p.id}')">${I('edit',15)} Modifier</button>
        ${p.licence?`<span class="tiny">${esc(p.licence)}</span>`:''}
      </div></div>`:''}`;
  }).join('');

  const srows=S.staff.map(s=>{
    const open=view.expC===s.id;
    return `<button class="prow" onclick="BB.expC('${s.id}')">
      <span class="avatar c">${esc(((s.prenom||'')[0]||'')+((s.nom||'')[0]||''))}</span>
      <span class="grow">
        <span class="name">${esc(staffName(s.id))}</span>
        <span class="meta" style="display:block">${[s.annee,s.commune].filter(Boolean).map(esc).join(' · ')||'coach'}${s.joueur?' · parent de '+esc(full(s.joueur)):''}</span>
      </span>
      <span class="chev${open?' open':''}">${I('chev',18)}</span>
    </button>
    ${open?`<div class="panel">${contactLines(s)}
      <div class="row" style="margin-top:10px">
        <button class="btn sm ghost" onclick="BB.editStaff('${s.id}')">${I('edit',15)} Modifier</button>
        ${s.licence?`<span class="tiny">${esc(s.licence)}</span>`:''}
      </div></div>`:''}`;
  }).join('');

  return `
  <div class="cols">
  <div class="colspan">
  <div class="row" style="margin-bottom:12px">
    <button class="btn" style="flex:1" onclick="BB.editPlayer()">${I('plus')} Ajouter un joueur</button>
    <button class="btn ghost" onclick="BB.importPlayers()">${I('up')} Importer</button>
  </div>
  <button class="btn ghost wide" style="margin-bottom:12px" onclick="BB.numeros()">${I('phone')} Récupérer les numéros pour le groupe WhatsApp</button>
  </div>
  <div class="col">
  <div class="card">
    <div class="card-h"><h3>Joueurs</h3><span class="tiny">${S.players.length}</span></div>
    ${rows||`<div class="empty">${I('users',30)}<b>Effectif vide</b>Saisissez les joueurs ou importez votre liste.</div>`}
  </div>
  </div>
  <div class="col">
  <div class="sec-title">${I('board',17)} Coachs</div>
  <div class="card">
    <div class="card-h"><h3>Coachs de l'équipe</h3>
      <button class="btn sm ghost" onclick="BB.editStaff()">${I('plus',15)} Ajouter</button></div>
    ${srows||`<div class="empty">${I('board',30)}<b>Aucun coach</b>Ajoutez-les : ils apparaîtront dans les convocations.</div>`}
  </div>
  </div></div>`;
}

export const effectifActions={
 expP(id){view.expP=view.expP===id?null:id;render()},

 expC(id){view.expC=view.expC===id?null:id;render()},

 numeros(){
   const st={portables:true,coachs:true,intl:false,sep:', '};
   const ov=sheet('Numéros pour le groupe WhatsApp',`<div id="nu"></div>`,()=>{},{noGuard:true});
   const box=ov.querySelector('#nu');

   const estPortable=v=>/^0\s*[67]/.test(String(v))||/^\+?33\s*[67]/.test(String(v));
   const inter=v=>{
     const d=String(v).replace(/[^\d+]/g,'');
     if(d.startsWith('+'))return d;
     if(d.startsWith('33'))return '+'+d;
     if(d.startsWith('0'))return '+33'+d.slice(1);
     return d;
   };
   function liste(){
     const out=[];
     const prendre=(src,qui)=>contacts(src).forEach(t=>{
       if(st.portables&&!estPortable(t.value))return;
       out.push({num:st.intl?inter(t.value):String(t.value).replace(/[\s.\-()]/g,''),
                 qui:qui+(t.label?' · '+t.label:'')});
     });
     S.players.filter(p=>p.actif).sort(byNom)
       .forEach(p=>prendre(p.tels,p.prenom+' '+p.nom));
     if(st.coachs)S.staff.forEach(c=>prendre(c.tels,(c.prenom+' '+c.nom).trim()+' (coach)'));
     const vus=new Set(), uniq=[];
     out.forEach(o=>{const k=o.num.replace(/\D/g,'');if(k&&!vus.has(k)){vus.add(k);uniq.push(o)}});
     return uniq;
   }
   function draw(){
     const l=liste(), txt=l.map(o=>o.num).join(st.sep);
     box.innerHTML=`
     <div class="card"><div class="card-b">
       <p class="tiny" style="margin-bottom:14px">Copiez cette liste, puis collez-la dans le champ des participants au moment de créer le groupe. Les doublons sont retirés.</p>
       <label class="check"><input type="checkbox" data-o="portables"${st.portables?' checked':''}> Portables uniquement (06 et 07)</label>
       <label class="check"><input type="checkbox" data-o="coachs"${st.coachs?' checked':''}> Inclure les coachs</label>
       <label class="check" style="margin-bottom:14px"><input type="checkbox" data-o="intl"${st.intl?' checked':''}> Format international (+33)</label>
       <div class="f"><span>Séparateur</span>
         <div class="seg mini" style="width:100%">
           <button type="button" data-s=", " aria-pressed="${st.sep===', '}">virgule</button>
           <button type="button" data-s=" ; " aria-pressed="${st.sep===' ; '}">point-virgule</button>
           <button type="button" data-s="\n" aria-pressed="${st.sep==='\n'}">une par ligne</button>
         </div>
       </div>
       <label class="f"><span>${l.length} numéro${l.length>1?'s':''}</span>
         <textarea id="nu_t" readonly style="min-height:150px;font-family:ui-monospace,Menlo,monospace">${esc(txt)}</textarea></label>
       <button class="btn wide" data-c="1"${l.length?'':' disabled'}>${I('copy',18)} Copier les ${l.length} numéros</button>
     </div></div>
     <div class="sec-title">${I('users',17)} Détail</div>
     <div class="card">${l.length?l.map(o=>`<div class="prow" style="min-height:52px">
         <span class="grow"><span class="name" style="font-size:14px">${esc(o.qui)}</span></span>
         <span class="tiny" style="font-variant-numeric:tabular-nums">${esc(o.num)}</span>
       </div>`).join(''):'<div class="empty">Aucun numéro ne correspond à ces critères.</div>'}</div>`;

     box.querySelectorAll('[data-o]').forEach(c=>c.onchange=()=>{st[c.dataset.o]=c.checked;draw()});
     box.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{st.sep=b.dataset.s;draw()});
     const cp=box.querySelector('[data-c]');
     if(cp)cp.onclick=()=>{
       copyText(txt);
       toast(l.length+' numéros copiés','check');
     };
   }
   draw();
 },

 editPlayer(id){
   const p=id?P(id):{nom:'',prenom:'',licence:'',annee:'',sexe:'M',commune:'',mails:[],tels:[],coach:false,actif:true};
   sheet(id?p.prenom+' '+p.nom:'Nouveau joueur',`
     <div class="card"><div class="card-b">
       <div class="grid2">
         <label class="f"><span>Nom</span><input id="p_n" value="${esc(p.nom)}"></label>
         <label class="f"><span>Prénom</span><input id="p_p" value="${esc(p.prenom)}"></label>
         <label class="f"><span>Licence</span><input id="p_l" value="${esc(p.licence)}"></label>
         <label class="f"><span>Année de naissance</span><input id="p_a" inputmode="numeric" value="${esc(p.annee)}"></label>
         <label class="f"><span>Sexe</span><input id="p_s" value="${esc(p.sexe)}"></label>
         <label class="f"><span>Commune</span><input id="p_c" value="${esc(p.commune)}"></label>
       </div>
       <div class="f"><span>Téléphones — précisez à qui appartient chaque numéro</span>
         <div id="p_tels">${(contacts(p.tels).length?contacts(p.tels):[{label:'',value:''}]).map(t=>cRow('tel',t.label,t.value)).join('')}</div>
         <button class="link" id="p_addt">${I('plus',16)} Ajouter un numéro</button></div>
       <div class="f"><span>Mails — précisez à qui appartient chaque adresse</span>
         <div id="p_mails">${(contacts(p.mails).length?contacts(p.mails):[{label:'',value:''}]).map(t=>cRow('mail',t.label,t.value)).join('')}</div>
         <button class="link" id="p_addm">${I('plus',16)} Ajouter une adresse</button></div>
       <div style="margin:6px 0 14px">
         <label class="check"><input type="checkbox" id="p_co"${p.coach?' checked':''}> Un parent est coach</label>
         <label class="check"><input type="checkbox" id="p_ac"${p.actif?' checked':''}> Actif dans l'effectif</label>
       </div>
       <button class="btn wide" id="p_ok">${I('check',18)} Enregistrer</button>
       ${id?`<button class="btn danger wide" style="margin-top:8px" id="p_del">${I('trash',17)} Supprimer le joueur</button>`:''}
     </div></div>`,ov=>{
       const addRow=(sel,kind)=>addContactRow(ov.querySelector(sel),kind);
       ov.querySelector('#p_addt').onclick=()=>addRow('#p_tels','tel');
       ov.querySelector('#p_addm').onclick=()=>addRow('#p_mails','mail');
       const readRows=(sel,kind)=>readContactRows(ov.querySelector(sel),kind);
       ov.querySelector('#p_ok').onclick=()=>{
         const g=s=>ov.querySelector(s).value.trim();
         const o={nom:g('#p_n'),prenom:g('#p_p'),licence:g('#p_l'),annee:g('#p_a'),sexe:g('#p_s'),commune:g('#p_c'),
           mails:readRows('#p_mails','mail'),tels:readRows('#p_tels','tel'),
           coach:ov.querySelector('#p_co').checked,actif:ov.querySelector('#p_ac').checked};
         if(!o.nom&&!o.prenom){toast('Nom ou prénom requis');return}
         if(id)Object.assign(P(id),o);else S.players.push(Object.assign({id:uid()},o));
         save();ov.remove();render();
       };
       const d=ov.querySelector('#p_del');
       if(d)d.onclick=()=>{
         if(!confirm('Supprimer ce joueur ?'))return;
         const av=snap();
         S.players=S.players.filter(x=>x.id!==id);
         S.matches.forEach(m=>['convoques','absents','transport','bar','lavage'].forEach(k=>m[k]=(m[k]||[]).filter(x=>x!==id)));
         save();ov.remove();render();toast('Joueur supprimé','trash',av);
       };
     });
 },

 editStaff(id){
   const s=id?ST(id):{prenom:'',nom:'',licence:'',annee:'',commune:'',mails:[],tels:[],joueur:''};
   const opts=S.players.slice().sort(byNom)
     .map(p=>`<option value="${p.id}"${s.joueur===p.id?' selected':''}>${esc(p.prenom+' '+p.nom)}</option>`).join('');
   sheet(id?coachName(id):'Nouveau coach',`
     <div class="card"><div class="card-b">
       <div class="grid2">
         <label class="f"><span>Nom</span><input id="k_n" value="${esc(s.nom)}"></label>
         <label class="f"><span>Prénom</span><input id="k_p" value="${esc(s.prenom)}"></label>
         <label class="f"><span>Licence</span><input id="k_l" value="${esc(s.licence||'')}"></label>
         <label class="f"><span>Année de naissance</span><input id="k_a" inputmode="numeric" value="${esc(s.annee||'')}"></label>
       </div>
       <label class="f"><span>Commune</span><input id="k_c" value="${esc(s.commune||'')}"></label>
       <div class="f"><span>Téléphones</span>
         <div id="k_tels">${(contacts(s.tels).length?contacts(s.tels):[{label:'',value:''}]).map(t=>cRow('tel',t.label,t.value)).join('')}</div>
         <button class="link" id="k_addt">${I('plus',16)} Ajouter un numéro</button></div>
       <div class="f"><span>Mails</span>
         <div id="k_mails">${(contacts(s.mails).length?contacts(s.mails):[{label:'',value:''}]).map(t=>cRow('mail',t.label,t.value)).join('')}</div>
         <button class="link" id="k_addm">${I('plus',16)} Ajouter une adresse</button></div>
       <label class="f"><span>Parent d'un joueur de l'équipe</span>
         <select id="k_j"><option value="">— aucun —</option>${opts}</select></label>
       <p class="tiny" style="margin-bottom:14px">Si un joueur est rattaché, sa famille est exemptée des roulements.</p>
       <button class="btn wide" id="k_ok">${I('check',18)} Enregistrer</button>
       ${id?`<button class="btn danger wide" style="margin-top:8px" id="k_del">${I('trash',17)} Supprimer le coach</button>`:''}
     </div></div>`,ov=>{
       const addRow=(sel,kind)=>addContactRow(ov.querySelector(sel),kind);
       ov.querySelector('#k_addt').onclick=()=>addRow('#k_tels','tel');
       ov.querySelector('#k_addm').onclick=()=>addRow('#k_mails','mail');
       const readRows=(sel,kind)=>readContactRows(ov.querySelector(sel),kind);
       ov.querySelector('#k_ok').onclick=()=>{
         const g=x=>ov.querySelector(x).value.trim();
         const o={prenom:g('#k_p'),nom:g('#k_n'),licence:g('#k_l'),annee:g('#k_a'),commune:g('#k_c'),
           tels:readRows('#k_tels','tel'),mails:readRows('#k_mails','mail'),joueur:g('#k_j')};
         if(!o.prenom&&!o.nom){toast('Nom ou prénom requis');return}
         if(id)Object.assign(ST(id),o);
         else{
           const ns=Object.assign({id:uid()},o);S.staff.push(ns);
           S.matches.forEach(m=>{m.staff=m.staff||[];if(!m.staff.includes(ns.id))m.staff.push(ns.id)});
         }
         if(o.joueur&&P(o.joueur))P(o.joueur).coach=true;
         save();ov.remove();render();
       };
       const d=ov.querySelector('#k_del');
       if(d)d.onclick=()=>{
         if(!confirm('Supprimer ce coach ?'))return;
         const av=snap();
         S.staff=S.staff.filter(x=>x.id!==id);
         S.matches.forEach(m=>m.staff=(m.staff||[]).filter(x=>x!==id));
         save();ov.remove();render();toast('Coach supprimé','trash',av);
       };
     });
 },

 importPlayers(){
   sheet('Importer des joueurs',`
   <div class="card"><div class="card-b">
     ${dzHtml('dz_p','Excel (.xlsx), CSV, TSV ou sauvegarde .json — ou '+tap+' pour parcourir',
       '.xlsx,.xlsm,.xls,.csv,.tsv,.txt,.json,application/json')}
     <button class="btn ghost wide" style="margin-top:10px" onclick="BB.gabarit()">${I('file')} Télécharger le gabarit Excel</button>
     <p class="tiny" style="margin:14px 0 8px">Colonnes attendues, dans cet ordre :<br>
       Nom · Prénom · Coach ? · Licence · Année · Sexe · Commune · Mails · Tél 1 · Tél 2 · Tél 3</p>
     <p class="tiny" style="margin:0 0 12px">Une sauvegarde .json de l\u2019outil apporte les joueurs et les coachs,
       avec leurs contacts. Ceux déjà présents ne sont pas dupliqués. Les matchs ne sont repris que par
       Réglages → Restaurer une sauvegarde.</p>
     <label class="f"><span>Ou collez vos lignes copiées depuis Excel, ou le contenu d\u2019une sauvegarde</span>
       <textarea id="i_t" placeholder="DUPONT&#9;Léo&#9;&#9;BC123456&#9;2014&#9;M&#9;GENESTON&#9;papa@mail.fr, maman@mail.fr&#9;06 11 22 33 44"></textarea></label>
     <label class="check" style="margin-bottom:12px"><input type="checkbox" id="i_r"> Remplacer l'effectif actuel</label>
     <button class="btn wide" id="i_ok">${I('up',18)} Importer</button>
   </div></div>`,ov=>{
     let rows=null, equipe=null;
     const resume=d=>{
       const nj=d.players.length, nc=Array.isArray(d.staff)?d.staff.length:0;
       return nj+' joueur'+(nj>1?'s':'')+(nc?' et '+nc+' coach'+(nc>1?'s':''):'')+', prêt à importer';
     };
     dropZone('dz_p','joueurs',r=>{rows=r;equipe=null},d=>{
       if(!isTeamFile(d)){rows=null;equipe=null;toast('Ce fichier n\u2019est pas une sauvegarde de l\u2019outil');return 'non reconnu'}
       rows=null;equipe=d;return resume(d);
     });
     ov.querySelector('#i_ok').onclick=()=>{
       const remplacer=ov.querySelector('#i_r').checked, colle=ov.querySelector('#i_t').value.trim();
       /* sauvegarde JSON : déposée, ou collée dans la zone de texte */
       let d=equipe;
       if(!d&&!rows&&colle.startsWith('{')){
         try{d=JSON.parse(colle)}catch(e){toast('Texte collé illisible : ce n\u2019est pas du JSON valide');return}
         if(!isTeamFile(d)){toast('Ce texte n\u2019est pas une sauvegarde de l\u2019outil');return}
       }
       if(d){
         const av=snap(), r=importTeam(d,remplacer);
         if(!r.joueurs&&!r.coachs&&!r.salles){toast(r.doublons?'Tout l\u2019effectif est déjà présent':'Aucun joueur dans ce fichier');return}
         const parts=[];
         if(r.joueurs)parts.push(r.joueurs+' joueur'+(r.joueurs>1?'s':''));
         if(r.coachs)parts.push(r.coachs+' coach'+(r.coachs>1?'s':''));
         let msg=(parts.join(' et ')||'Aucun joueur')+' importé'+(r.joueurs+r.coachs>1?'s':'');
         if(r.doublons)msg+=', '+r.doublons+' déjà présent'+(r.doublons>1?'s':'');
         save();ov.remove();render();toast(msg,'check',av);
         return;
       }
       const r=rows||splitLines(colle);
       if(!r||!r.length){toast('Rien à importer');return}
       const out=[];
       r.forEach((c,i)=>{
         if(i===0&&/nom/i.test(c[0]||'')&&/pr[ée]nom/i.test(c[1]||''))return;
         if(!c[0]&&!c[1])return;
         out.push({id:uid(),nom:c[0]||'',prenom:c[1]||'',coach:/oui|x|1/i.test(c[2]||''),
           licence:c[3]||'',annee:c[4]||'',sexe:c[5]||'M',commune:c[6]||'',
           mails:normContacts((c[7]||'').split(/[,;]/).map(x=>x.trim()).filter(Boolean),'mail'),
           tels:normContacts([c[8],c[9],c[10]].map(x=>(x||'').trim()).filter(Boolean),'tel'),
           actif:true});
       });
       if(!out.length){toast('Aucune ligne reconnue');return}
       S.players=remplacer?out:S.players.concat(out);
       if(remplacer)pruneRefs();
       save();ov.remove();render();toast(out.length+' joueur(s) importé(s)','check');
     };
   });
 },
};
