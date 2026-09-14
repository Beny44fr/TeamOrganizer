/* Calendrier et fiche d'un match : convocations, coachs présents,
   roulements, texte de la convocation, import du calendrier. */
import {I} from '../core/icons.js';
import {S, save, view} from '../core/state.js';
import {aujourdhui, COARSE, dayName, dayNum, esc, frDate, normHeure, rel, tap, TAP, toHM, toMin, uid} from '../core/utils.js';
import {buildMsg, msgOf} from '../domain/message.js';
import {coachName, curMatch, estPasse, full, initials, isStaffFam, nbTransport, pre, registerSalle, salleAdr, salles, sortedMatches, times} from '../domain/model.js';
import {counts, cycle, suggest} from '../domain/roulements.js';
import {estimTrajet, mapsUrl} from '../domain/trajets.js';
import {copyText, sheet, snap, toast} from '../ui/components.js';
import {dropZone, dzHtml, splitLines} from '../ui/files.js';
import {render} from './layout.js';

function matchRow(m,next){
  const t=times(m), dom=m.lieu==='domicile';
  const d1=dom?(m.bar||[]).length>=2:(m.transport||[]).length>=nbTransport(m);
  const r=rel(m.date);
  return `<button class="match${next?' is-next':''}" onclick="BB.open('${m.id}')">
    <div class="mdate"><b>${dayNum(m.date)}</b><span>${dayName(m.date)}</span></div>
    <div class="mbody">
      <div class="l1"><span class="name">${esc(m.adversaire||'Adversaire ?')}</span>
        <span class="pill ${dom?'dom':'ext'}">${dom?'Domicile':'Extérieur'}</span></div>
      <div class="l2">${r?esc(r)+' · ':''}match ${toHM(toMin(m.heure))} · RDV ${toHM(t.rdv)} · ${esc(dom?(m.salle||''):('départ '+(m.depart||'')))}</div>
      <div class="duty">
        <i class="${(m.convoques||[]).length?'ok':''}">${I('users',14)}</i>
        <i class="${d1?'ok':''}">${I(dom?'cup':'car',14)}</i>
        <i class="${(m.lavage||[]).length?'ok':''}">${I('shirt',14)}</i>
        ${next?'<span class="pill next" style="margin-left:5px">prochain</span>':''}
      </div>
    </div>
  </button>`;
}

function heroCard(m){
  const t=times(m), dom=m.lieu==='domicile', r=rel(m.date);
  const d=new Date(m.date+'T12:00:00');
  const quand=(isNaN(d)?'':d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}));
  const manque=[];
  if(!(m.convoques||[]).length)manque.push('convocations');
  if(dom?(m.bar||[]).length<2:(m.transport||[]).length<nbTransport(m))manque.push(dom?'bar':'transport');
  if(!(m.lavage||[]).length)manque.push('maillots');
  return `<div class="hero">
    <div class="lbl">${r?esc(r):'prochain match'}</div>
    <h2>${esc(m.adversaire||'Adversaire ?')} <span class="pill ${dom?'dom':'ext'}">${dom?'domicile':'extérieur'}</span></h2>
    <div class="when">${esc(quand)} · ${esc(dom?(m.salle||''):(m.salle||m.adresse||''))}</div>
    <div class="htimes">
      <div class="hi"><span>${dom?'Rendez-vous':'Départ'}</span><b>${toHM(t.rdv)}</b></div>
      ${dom?'':`<div><span>Arrivée</span><b>${toHM(t.arrivee)}</b></div>`}
      <div><span>Match</span><b>${toHM(toMin(m.heure))}</b></div>
    </div>
    ${manque.length?`<div class="tiny" style="margin-top:12px">${I('ban',14)} Reste à faire : ${manque.join(', ')}.</div>`:
      `<div class="tiny" style="margin-top:12px">${I('check',14)} Tout est attribué.</div>`}
    <div class="hact">
      <button class="btn" onclick="BB.open('${m.id}')">${I('cal',17)} Ouvrir</button>
      <button class="btn ghost" onclick="BB.openThen('${m.id}','copyMsg')">${I('copy',17)} Copier</button>
    </div>
  </div>`;
}

export function matchList(){
  const ms=sortedMatches(), today=aujourdhui();
  const next=ms.filter(m=>(m.date||'')>=today), past=ms.filter(m=>(m.date||'')<today).reverse();
  return `
  ${next.length?heroCard(next[0]):''}
  <div class="row" style="margin-bottom:12px">
    <button class="btn" style="flex:1" onclick="BB.editMatch()">${I('plus')} Ajouter un match</button>
    <button class="btn ghost" onclick="BB.importMatches()">${I('up')} Importer</button>
  </div>
  ${next.length>1?`<button class="btn ghost wide" style="margin-bottom:12px" onclick="BB.plan()">${I('wand')} Planifier plusieurs matchs</button>`:''}
  <div class="card">
    <div class="card-h"><h3>À venir</h3><span class="tiny">${next.length}</span></div>
    ${next.map((m,i)=>matchRow(m,i===0)).join('')||
      `<div class="empty">${I('cal',30)}<b>Aucun match à venir</b>Ajoutez un match ou importez le calendrier de la saison.</div>`}
  </div>
  ${past.length?`<details class="card past">
    <summary>${I('clock')} Matchs passés <span class="tiny">${past.length}</span> <span class="chev">${I('chev')}</span></summary>
    ${past.map(m=>matchRow(m,false)).join('')}
  </details>`:''}`;
}

export function matchDetail(){
  const m=curMatch();
  if(!m){view.match=null;return matchList()}
  const t=times(m), dom=m.lieu==='domicile', c=counts(m.id), cy=cycle(m);
  const nbT=nbTransport(m), passe=estPasse(m);
  const pool=S.players.filter(p=>p.actif);
  const conv=pool.map(p=>{
    const isC=(m.convoques||[]).includes(p.id), isA=(m.absents||[]).includes(p.id);
    const et=isC?'c':(isA?'a':''), n=(c[p.id]||{}).convocs||0;
    return `<button class="jchip" data-et="${et}" onclick="BB.cycleConv('${p.id}')"
      title="${esc(full(p.id))} — ${n} convocation${n>1?'s':''}${isA?' · noté absent':''}">
      <span class="jav">${isC?I('check',15):(isA?I('ban',15):esc(initials(p)))}</span>
      <span class="jnm">${esc(pre(p.id))}</span>
      <span class="jn">${n}</span>
    </button>`;
  }).join('');

  const taskBlock=(key,label,icon,n,help,nbCtl)=>{
    const cur=m[key]||[], lav=key==='lavage';
    const cand=(m.convoques&&m.convoques.length)?m.convoques:pool.map(p=>p.id);
    const chips=cand.map(id=>{
      const ex=S.settings.exemptStaff&&isStaffFam(id);
      const done=lav&&!ex&&cy.done.includes(id);
      const tt=ex?'Famille d\u2019un coach, exemptée':(done?'A déjà lavé pendant ce tour':'');
      return `<button class="chip${done||ex?' done':''}" data-on="${cur.includes(id)?1:0}"
        onclick="BB.toggleTask('${key}','${id}',${n})" ${tt?'title="'+tt+'"':''}>${esc(pre(id))}<span class="n">${done?'✓':''}${(c[id]||{})[key]||0}</span></button>`;
    }).join('');
    let note='';
    if(lav){
      const rest=cy.left.filter(id=>!cur.includes(id)).length;
      const hs=cur.filter(id=>cy.done.includes(id));
      note=`<div class="tiny" style="margin-bottom:8px">Tour ${cy.tour} · ${cy.total-cy.left.length}/${cy.total} familles passées, ${rest} restante${rest>1?'s':''}.</div>`
        +(hs.length?`<div class="warn" style="margin-top:0;margin-bottom:9px">${hs.map(id=>esc(pre(id))).join(', ')} a déjà lavé pendant ce tour.</div>`:'');
    }
    return `<div class="task">
      <div class="th"><b>${I(icon)} ${label} <span class="tiny">${cur.length}/${n}</span></b>
        ${passe?'':`<button class="btn sm ghost" onclick="BB.auto('${key}',${n})">${I('wand',16)} Proposer</button>`}</div>
      <div class="tiny" style="margin-bottom:9px">${help}</div>
      ${nbCtl?`<div class="nbsel">
        <span class="tiny">Nombre de voitures</span>
        <div class="seg mini">${[1,2,3,4].map(k=>`<button type="button" aria-pressed="${k===n}" onclick="BB.setNb('${key}',${k})">${k}</button>`).join('')}</div>
      </div>`:''}${note}
      <div class="chips">${chips}</div>
    </div>`;
  };

  return `
  <div class="cols">
  <div class="colspan">
  <button class="link" onclick="BB.go('matchs')">${I('back',18)} Calendrier</button>
  <div class="card" style="margin-top:4px">
    <div class="card-h">
      <div style="min-width:0">
        <h3>${esc(m.adversaire||'Adversaire ?')}</h3>
        <div class="tiny" style="text-transform:capitalize">${esc(frDate(m.date))}${rel(m.date)?' · '+esc(rel(m.date)):''}</div>
      </div>
      <span class="pill ${dom?'dom':'ext'}">${dom?'Domicile':'Extérieur'}</span>
    </div>
    <div class="card-b">
      <div class="clock">
        ${dom?`
          <div class="hi"><span>Rendez-vous</span><b>${toHM(t.rdv)}</b><i>${esc(m.salle||'')}</i></div>
          <div><span>Coup d'envoi</span><b>${toHM(toMin(m.heure))}</b><i>${S.settings.avant} min après</i></div>`
        :`
          <div class="hi"><span>Départ</span><b>${toHM(t.rdv)}</b><i>${esc(m.depart||S.settings.salleDef)}</i></div>
          <div><span>Arrivée</span><b>${toHM(t.arrivee)}</b><i>${m.trajet||0} min de route</i></div>
          <div><span>Match</span><b>${toHM(toMin(m.heure))}</b><i>${esc(m.salle||'')}</i></div>`}
      </div>
      ${m.adresse?`<div class="tiny" style="margin-top:11px;display:flex;gap:6px;align-items:flex-start">${I('pin',15)} <span>${esc(m.adresse)}</span></div>`:''}
      <div class="row" style="margin-top:13px">
        ${mapsUrl(m)?`<button class="btn sm ghost" onclick="BB.maps('${m.id}')">${I('map',16)} ${dom?'Voir la salle':'Itinéraire'}</button>`:''}
        <button class="btn sm ghost" onclick="BB.editMatch('${m.id}')">${I('edit',16)} Modifier</button>
        <button class="btn sm danger" onclick="BB.delMatch('${m.id}')">${I('trash',16)} Supprimer</button>
      </div>
    </div>
  </div>

  </div>
  <div class="col">
  <div class="sec-title">${I('users',17)} Convocations</div>
  <div class="card"><div class="card-b">
    <div class="jhead">
      <b>${(m.convoques||[]).length} convoqué${(m.convoques||[]).length>1?'s':''} sur ${pool.length}${(m.absents||[]).length?' · '+(m.absents||[]).length+' absent'+((m.absents||[]).length>1?'s':''):''}</b>
      <span class="row" style="gap:14px">
        <button class="link subtle" onclick="BB.allConv(1)">Tous</button>
        <button class="link subtle" onclick="BB.allConv(0)">Aucun</button>
      </span>
    </div>
    <div class="jgrid">${conv}</div>
    ${(m.absents||[]).length?`<div class="absline">${I('ban',15)} Absents : ${(m.absents||[]).map(id=>esc(pre(id))).join(', ')}</div>`:''}
    <div class="tiny" style="margin-top:11px">${TAP} pour faire défiler : non retenu → convoqué → absent. Le chiffre indique le nombre de convocations depuis le début de la saison. Un joueur noté absent n'est plus proposé pour les tours.</div>
  </div></div>

  <div class="sec-title">${I('board',17)} Coachs présents — ${(m.staff||[]).length}</div>
  <div class="card"><div class="card-b">
    ${S.staff.length?`<div class="chips">${S.staff.map(s=>`<button class="chip" data-on="${(m.staff||[]).includes(s.id)?1:0}"
        onclick="BB.toggleStaff('${s.id}')">${esc(coachName(s.id))}</button>`).join('')}</div>`
      :`<p class="muted">Aucun coach enregistré. <button class="link" onclick="BB.go('joueurs')">En ajouter un</button></p>`}
  </div></div>

  </div>
  <div class="col">
  <div class="sec-title">${I('scale',17)} Roulements</div>
  ${passe?`<div class="warn" style="margin:0 0 12px;display:flex;gap:10px;align-items:flex-start">${I('clock',17)}
    <span>Match passé. L'attribution automatique est désactivée pour ne pas réécrire l'historique sur lequel repose l'équité. Vous pouvez toujours corriger à la main.</span></div>`
   :`<button class="btn ghost wide" style="margin-bottom:11px" onclick="BB.autoAll()">${I('wand',17)} Tout proposer selon l'équité</button>`}
  ${dom?taskBlock('bar','Bar','cup',2,'2 familles par match à domicile.')
       :taskBlock('transport','Transport','car',nbT,
          nbT+' famille'+(nbT>1?'s':'')+' conductrice'+(nbT>1?'s':'')+' pour ce déplacement.'
          +((m.convoques||[]).length?' '+(m.convoques||[]).length+' joueurs convoqués'+((m.staff||[]).length?' et '+(m.staff||[]).length+' coach'+((m.staff||[]).length>1?'s':''):'')+' à transporter.':''),
          true)}
  ${taskBlock('lavage','Lavage des maillots','shirt',1,'1 famille par match, à tour de rôle : chacune passe une fois avant qu\u2019une famille repasse.')}

  </div>
  <div class="colspan">
  <div class="sec-title">${I('mail',17)} Convocation
    ${m.msg!=null?'<span class="pill">texte modifié</span>':''}
    <button class="link subtle" style="margin-left:auto;text-transform:none;letter-spacing:0" onclick="BB.editMsg()">${I('edit',15)} Modifier</button>
  </div>
  <div class="msg" onclick="BB.editMsg()" title="${COARSE?'Toucher':'Cliquer'} pour modifier">${esc(msgOf(m))}</div>
  ${m.msg!=null?`<div class="warn" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <span style="flex:1;min-width:160px">Ce texte a été écrit à la main : il ne suit plus les changements de convocation ou de tours.</span>
    <button class="btn sm ghost" onclick="BB.resetMsg()">${I('undo',15)} Régénérer</button>
  </div>`:''}
  <div class="actionbar">
    <button class="btn wide" onclick="BB.copyMsg()">${I('copy')} Copier la convocation</button>
  </div>
  </div></div>`;
}

export const matchActions={
 open(id){view.tab='matchs';view.match=id;render();window.scrollTo(0,0)},

 /* non retenu → convoqué → absent → non retenu */
 cycleConv(pid){
   const m=curMatch();
   m.convoques=m.convoques||[];m.absents=m.absents||[];
   const isC=m.convoques.includes(pid), isA=m.absents.includes(pid);
   m.convoques=m.convoques.filter(x=>x!==pid);
   m.absents=m.absents.filter(x=>x!==pid);
   if(!isC&&!isA)m.convoques.push(pid);
   else if(isC){
     m.absents.push(pid);
     ['transport','bar','lavage'].forEach(k=>{m[k]=(m[k]||[]).filter(x=>x!==pid)});
   }else{
     ['transport','bar','lavage'].forEach(k=>{m[k]=(m[k]||[]).filter(x=>x!==pid)});
   }
   save();render();
 },

 allConv(on){
   const av=snap();
   const m=curMatch();
   const abs=new Set(m.absents||[]);
   m.convoques=on?S.players.filter(p=>p.actif&&!abs.has(p.id)).map(p=>p.id):[];
   if(!on)['transport','bar','lavage'].forEach(k=>m[k]=[]);
   save();render();
   if(!on)toast('Convocations et tours retirés','ban',av);
 },

 toggleTask(key,pid,n){
   const m=curMatch();
   m[key]=m[key]||[];
   const i=m[key].indexOf(pid);
   if(i>=0)m[key].splice(i,1);
   else{m[key].push(pid);if(m[key].length>n)m[key].shift()}
   save();render();
 },

 toggleStaff(sid){
   const m=curMatch();
   m.staff=m.staff||[];
   const i=m.staff.indexOf(sid);
   if(i<0)m.staff.push(sid);else m.staff.splice(i,1);
   save();render();
 },

 setNb(key,n){
   const m=curMatch();
   m.nbTransport=n;
   if((m[key]||[]).length>n)m[key]=m[key].slice(-n);
   save();render();
 },

 auto(key,n){
   const m0=curMatch();
   if(estPasse(m0)){toast('Match passé : à modifier à la main','ban');return}
   const av=snap();
   const m=m0;
   m[key]=suggest(m,key,n);save();render();
   toast('Proposé selon l\u2019équité','wand',av);
 },

 autoAll(){
   const m0=curMatch();
   if(estPasse(m0)){toast('Match passé : à modifier à la main','ban');return}
   const av=snap();
   const m=m0;
   if(m.lieu==='domicile'){m.bar=[];m.lavage=[];m.bar=suggest(m,'bar',2)}
   else{m.transport=[];m.lavage=[];m.transport=suggest(m,'transport',nbTransport(m))}
   m.lavage=suggest(m,'lavage',1);
   save();render();toast('Tours proposés','wand',av);
 },

 copyMsg(){
   const m=curMatch();
   copyText(msgOf(m));toast('Convocation copiée','check');
 },

 editMsg(){
   const m=curMatch();
   const perso=m.msg!=null;
   sheet('Modifier la convocation',`
     <div class="card"><div class="card-b">
       <p class="tiny" style="margin-bottom:12px">Ce texte ne concerne que ce match. Pour changer la présentation de toutes vos convocations, modifiez plutôt les modèles dans Réglages.</p>
       <label class="f"><textarea id="mg_t" style="min-height:320px">${esc(msgOf(m))}</textarea></label>
       <button class="btn wide" id="mg_ok">${I('check',18)} Enregistrer</button>
       ${perso?`<button class="btn ghost wide" style="margin-top:8px" id="mg_rz">${I('undo',17)} Revenir au texte automatique</button>`:''}
     </div></div>`,ov=>{
       ov.querySelector('#mg_ok').onclick=()=>{
         const v=ov.querySelector('#mg_t').value;
         m.msg=(v.trim()===buildMsg(m).trim())?undefined:v;
         if(m.msg===undefined)delete m.msg;
         save();ov.remove();render();
         toast(m.msg!=null?'Texte enregistré':'Texte identique au modèle','check');
       };
       const r=ov.querySelector('#mg_rz');
       if(r)r.onclick=()=>{delete m.msg;save();ov.remove();render();toast('Texte régénéré','check')};
     });
 },

 resetMsg(){
   const m=curMatch();
   if(!confirm('Régénérer le texte à partir du modèle ? Vos modifications seront perdues.'))return;
   const av=snap();
   delete m.msg;save();render();toast('Texte régénéré','check',av);
 },

 openThen(id,act){
   view.tab='matchs';view.match=id;render();window.scrollTo(0,0);
   if(this[act])this[act]();
 },

 maps(id){
   const u=mapsUrl(S.matches.find(x=>x.id===id));
   if(!u){toast('Aucune adresse renseignée');return}
   window.open(u,'_blank');
 },

 delMatch(id){
   const m=S.matches.find(x=>x.id===id);
   if(!confirm('Supprimer le match contre '+((m&&m.adversaire)||'?')+' ?'))return;
   const av=snap();
   S.matches=S.matches.filter(x=>x.id!==id);view.match=null;save();render();
   toast('Match supprimé','trash',av);
 },

 importMatches(){
   sheet('Importer un calendrier',`
   <div class="card"><div class="card-b">
     ${dzHtml('dz_m','Excel (.xlsx), CSV ou TSV — ou '+tap+' pour parcourir')}
     <button class="btn ghost wide" style="margin-top:10px" onclick="BB.gabarit()">${I('file')} Télécharger le gabarit Excel</button>
     <p class="tiny" style="margin:14px 0 8px">Colonnes attendues :<br>
       Date (jj/mm/aaaa) · Heure · Adversaire · D ou E · Salle · Adresse · Trajet (min)<br>
       Salle à domicile : ${salles().length?salles().map(x=>esc(x.nom)).join(', '):'aucune salle enregistrée pour l’instant, elle sera créée à l’import'}. Trajet vide = estimé automatiquement.</p>
     <label class="f"><span>Ou collez vos lignes copiées depuis Excel</span>
       <textarea id="c_t" placeholder="14/09/2026&#9;14h00&#9;BC Vertou&#9;E&#9;Salle du Loiry&#9;Vertou&#9;"></textarea></label>
     <button class="btn wide" id="c_ok">${I('up',18)} Importer</button>
   </div></div>`,ov=>{
     let rows=null;
     dropZone('dz_m','matchs',r=>{rows=r});
     ov.querySelector('#c_ok').onclick=()=>{
       const r=rows||splitLines(ov.querySelector('#c_t').value);
       if(!r||!r.length){toast('Rien à importer');return}
       let n=0;
       r.forEach((c,i)=>{
         if(i===0&&/date/i.test(c[0]||''))return;
         const d=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((c[0]||'').trim());
         const iso=d?`${d[3]}-${d[2].padStart(2,'0')}-${d[1].padStart(2,'0')}`
                   :(/^\d{4}-\d{2}-\d{2}$/.test((c[0]||'').trim())?c[0].trim():null);
         if(!iso)return;
         const ext=/^e/i.test((c[3]||'').trim());
         const sal=(c[4]||'').trim();
         /* Une salle à domicile encore inconnue est créée au passage : le calendrier
            s'importe avant même d'avoir rempli les réglages. */
         const home=ext?'':(registerSalle(sal)||S.settings.salleDef);
         const m={id:uid(),date:iso,heure:normHeure(c[1]||''),adversaire:(c[2]||'').trim(),
           lieu:ext?'exterieur':'domicile',
           salle:ext?sal:home,
           adresse:ext?(c[5]||'').trim():salleAdr(home),
           depart:ext?(S.settings.salleDef||home):home,
           trajet:ext?(+(c[6]||0)||0):0,
           convoques:[],transport:[],bar:[],lavage:[],staff:S.staff.map(x=>x.id)};
         if(ext&&!m.trajet){
           const e=estimTrajet(m.depart,m.adresse);
           if(e)m.trajet=e.min;
         }
         S.matches.push(m);n++;
       });
       if(!n){toast('Aucune date reconnue');return}
       save();ov.remove();render();toast(n+' match(s) importé(s)','check');
     };
   });
 },
};
