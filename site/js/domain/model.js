/* Modèle de données : accès aux joueurs, coachs, salles et matchs, état
   vierge, migration des anciennes sauvegardes, horaires et état d'avancement. */
import {S, view} from '../core/state.js';
import {aujourdhui, normHeure, normTxt, toMin, uid} from '../core/utils.js';
import {LIGNE_ABSENTS, SALUT, TPL_DOM, TPL_EXT} from './message.js';

export const P=id=>S.players.find(p=>p.id===id);

export const full=id=>{const p=P(id);return p?p.prenom+' '+p.nom:'?'};

export const pre=id=>{
  const p=P(id); if(!p)return '?';
  const dup=S.players.some(o=>o.id!==id&&(o.prenom||'').toLowerCase()===(p.prenom||'').toLowerCase());
  return p.prenom+(dup?' '+(p.nom||'').charAt(0).toUpperCase()+'.':'');
};

export const ST=id=>S.staff.find(s=>s.id===id);

export const staffName=id=>{const s=ST(id);return s?(s.prenom+' '+s.nom).trim():'?'};

export const coachName=id=>{
  const s=ST(id); if(!s)return '?';
  const dup=S.staff.some(o=>o.id!==id&&(o.prenom||'').toLowerCase()===(s.prenom||'').toLowerCase());
  return (s.prenom||s.nom)+(dup?' '+(s.nom||'').charAt(0).toUpperCase()+'.':'');
};

export const isStaffFam=pid=>{const p=P(pid);return !!(p&&p.coach)||S.staff.some(s=>s.joueur===pid)};

export const staffOf=pid=>S.staff.filter(s=>s.joueur===pid);

export const eligible=()=>S.players.filter(p=>p.actif&&!(S.settings.exemptStaff&&isStaffFam(p.id)));

export const initials=p=>((p.prenom||'')[0]||'')+((p.nom||'')[0]||'');

export const salles=()=>S.settings.salles||[];

export const salleAdr=n=>{const s=salles().find(x=>x.nom===n);return s?(s.adresse||''):''};

export function registerSalle(nom){
  nom=String(nom||'').trim();
  if(!nom)return '';
  const dej=salles().find(s=>s.nom.toLowerCase()===nom.toLowerCase());
  if(dej)return dej.nom;
  S.settings.salles=salles().concat({id:uid(),nom:nom,adresse:''});
  if(!S.settings.salleDef)S.settings.salleDef=nom;
  return nom;
}

export const sortedMatches=()=>[...S.matches].sort((a,b)=>((a.date||'')+(a.heure||'')).localeCompare((b.date||'')+(b.heure||'')));
/* Le match ouvert à l'écran. */
export const curMatch=()=>S.matches.find(x=>x.id===view.match);
/* Tri alphabétique par nom de famille. */
export const byNom=(a,b)=>(a.nom||'').localeCompare(b.nom||'','fr');

export function times(m){
  const h=toMin(m.heure), av=+S.settings.avant||45;
  if(h==null)return {rdv:null,arrivee:null};
  if(m.lieu==='domicile')return {rdv:h-av,arrivee:h-av};
  return {rdv:h-av-(+m.trajet||0),arrivee:h-av};
}

/* Un match passé ne se modifie qu'à la main : aucune attribution automatique,
   pour ne pas réécrire un historique sur lequel repose le calcul d'équité. */
export const estPasse=m=>!!m&&(m.date||'')<aujourdhui();

/* nombre de voitures attendues pour un déplacement : 2 par défaut, réglable par match */
export const nbTransport=m=>Math.min(4,Math.max(1,+m.nbTransport||2));

export function isReady(m){
  const a=m.lieu==='domicile'?(m.bar||[]).length>=2:(m.transport||[]).length>=nbTransport(m);
  return a&&(m.lavage||[]).length>=1&&(m.convoques||[]).length>0;
}

export function todo(){
  const t=aujourdhui();
  return S.matches.filter(m=>(m.date||'')>=t&&!isReady(m)).length;
}

/* Application vierge : aucune donnée d'exemple n'est livrée avec le site.
   settings.onboarding porte l'étape du parcours de démarrage, 0 une fois terminé. */
export function blank(){
  return {
    settings:{equipe:'',salles:[],salleDef:'',avant:45,exemptStaff:true,
              tplDom:TPL_DOM,tplExt:TPL_EXT,tplV:2,onboarding:1},
    players:[], staff:[], matches:[]
  };
}

export function autoLabel(v,i,kind){
  if(kind==='tel')return /^0\s*[1-59]/.test(String(v))?'Fixe':'Tél '+(i+1);
  return 'Parent '+(i+1);
}

export function normContacts(arr,kind){
  return (arr||[]).map((x,i)=>typeof x==='string'?{label:autoLabel(x,i,kind),value:x}:x)
    .filter(x=>x&&x.value);
}

export const contacts=a=>(a||[]).filter(x=>x&&x.value);

export function migrate(){
  S.staff=S.staff||[]; S.settings=S.settings||{}; S.players=S.players||[]; S.matches=S.matches||[];
  if(!Array.isArray(S.settings.salles))S.settings.salles=[];
  S.settings.salles=S.settings.salles.map(s=>typeof s==='string'?{nom:s,adresse:''}:s).filter(s=>s&&s.nom);
  S.settings.salles.forEach(s=>{if(!s.id)s.id=uid()});
  /* la salle par défaut suit la liste : vide tant qu'aucune salle n'est saisie */
  if(!S.settings.salles.some(s=>s.nom===S.settings.salleDef))
    S.settings.salleDef=S.settings.salles.length?S.settings.salles[0].nom:'';
  /* Le parcours de démarrage ne s'affiche que pour une installation neuve :
     une sauvegarde restaurée ou des données déjà saisies l'ont dépassé. */
  if(S.settings.onboarding===undefined)
    S.settings.onboarding=(S.players.length||S.matches.length||S.settings.salles.length)?0:1;
  delete S.settings.salle; delete S.settings.trajetDef;
  delete S.settings.defMontbert; delete S.settings.coachsAjoutes;
  if(S.settings.exemptStaff===undefined)S.settings.exemptStaff=true;
  if(!S.settings.avant)S.settings.avant=45;
  S.players.forEach(p=>{p.mails=normContacts(p.mails,'mail');p.tels=normContacts(p.tels,'tel')});
  S.staff.forEach(s=>{
    s.mails=normContacts(s.mails&&s.mails.length?s.mails:(s.mail?[s.mail]:[]),'mail');
    s.tels=normContacts(s.tels&&s.tels.length?s.tels:(s.tel?[s.tel]:[]),'tel');
    delete s.mail;delete s.tel;delete s.role;
  });
  S.matches.forEach(m=>{
    if(!Array.isArray(m.staff))m.staff=S.staff.map(s=>s.id);
    if(!Array.isArray(m.absents))m.absents=[];
    if(!m.depart)m.depart=(m.lieu==='domicile'?(m.salle||S.settings.salleDef):S.settings.salleDef);
    m.heure=normHeure(m.heure);
  });
  if(!S.settings.tplDom)S.settings.tplDom=TPL_DOM;
  if(!S.settings.tplExt)S.settings.tplExt=TPL_EXT;
  ['tplDom','tplExt'].forEach(k=>{
    S.settings[k]=S.settings[k]
      .replace(/👤 Encadrement : \{encadrement\}/g,'👤 Coachs : {coachs}')
      .replace(/\{encadrement\}/g,'{coachs}');
    if(!S.settings[k].includes('{coachs}'))
      S.settings[k]=S.settings[k].includes('{joueurs}')
        ? S.settings[k].replace('{joueurs}','{joueurs}\n\n👤 Coachs : {coachs}')
        : S.settings[k]+'\n👤 Coachs : {coachs}';
  });
  /* Modèles v2 : formule d'accueil en tête et ligne des absents sous les joueurs.
     Appliqué une seule fois (tplV) : une ligne retirée ensuite à la main ne
     revient pas au rechargement. */
  if((+S.settings.tplV||1)<2){
    ['tplDom','tplExt'].forEach(k=>{
      let t=S.settings[k];
      if(!t.includes(SALUT))t=SALUT+'\n\n'+t;
      if(!t.includes('{absents}'))
        t=t.includes('{joueurs}')?t.replace('{joueurs}','{joueurs}\n'+LIGNE_ABSENTS):t+'\n'+LIGNE_ABSENTS;
      S.settings[k]=t;
    });
    S.settings.tplV=2;
  }
}

/* Retire des matchs les joueurs et coachs qui n'existent plus, et les liens
   coach → joueur devenus orphelins. Sert après un remplacement d'effectif. */
export function pruneRefs(){
  const pj=new Set(S.players.map(p=>p.id)), pc=new Set(S.staff.map(s=>s.id));
  S.matches.forEach(m=>{
    ['convoques','absents','transport','bar','lavage'].forEach(k=>m[k]=(m[k]||[]).filter(x=>pj.has(x)));
    m.staff=(m.staff||[]).filter(x=>pc.has(x));
  });
  S.staff.forEach(s=>{if(s.joueur&&!pj.has(s.joueur))s.joueur=''});
}

/* Une sauvegarde JSON de l'outil : on n'exige que la liste des joueurs. */
export const isTeamFile=d=>!!d&&typeof d==='object'&&Array.isArray(d.players);

/* Import d'une équipe depuis une sauvegarde JSON de l'outil : joueurs et coachs,
   avec leurs contacts et les liens coach → joueur. En ajout, un joueur ou un coach
   déjà présent — même licence, ou à défaut mêmes nom et prénom — n'est pas
   dupliqué. Le nom de l'équipe et les salles ne sont repris que s'ils sont encore
   vides : l'import ne remplace jamais un réglage. Les matchs ne sont pas repris,
   c'est le rôle de la restauration. */
export function importTeam(data,replace){
  const cle=x=>x.licence?'L:'+normTxt(x.licence):'N:'+normTxt(x.nom)+'|'+normTxt(x.prenom);
  const res={joueurs:0,coachs:0,doublons:0,salles:0};
  /* En remplacement, un identifiant ne passe pas d'une personne à une autre : les
     matchs qui le citent attribueraient l'historique au mauvais joueur. */
  const avant=replace?new Map(S.players.concat(S.staff).map(x=>[x.id,cle(x)])):null;
  if(replace){S.players=[];S.staff=[]}
  const pris=new Set(S.players.map(p=>p.id).concat(S.staff.map(s=>s.id)));
  /* on garde l'identifiant d'origine s'il est libre, ou s'il désignait déjà la
     même personne : réimporter sa propre sauvegarde conserve l'historique */
  const libre=(id,c)=>{
    const v=id&&!pris.has(id)&&!(avant&&avant.has(id)&&avant.get(id)!==c)?String(id):uid();
    pris.add(v);return v;
  };
  const vers={};
  (data.players||[]).forEach(p=>{
    if(!p||!(p.nom||p.prenom))return;
    const dej=S.players.find(x=>cle(x)===cle(p));
    if(dej){vers[p.id]=dej.id;res.doublons++;return}
    const id=libre(p.id,cle(p)); vers[p.id]=id;
    S.players.push({id,nom:p.nom||'',prenom:p.prenom||'',licence:p.licence||'',annee:p.annee||'',
      sexe:p.sexe||'M',commune:p.commune||'',
      mails:normContacts(p.mails&&p.mails.length?p.mails:(p.mail?[p.mail]:[]),'mail'),
      tels:normContacts(p.tels&&p.tels.length?p.tels:(p.tel?[p.tel]:[]),'tel'),
      coach:!!p.coach,actif:p.actif!==false});
    res.joueurs++;
  });
  (data.staff||[]).forEach(s=>{
    if(!s||!(s.nom||s.prenom))return;
    if(S.staff.some(x=>cle(x)===cle(s))){res.doublons++;return}
    const id=libre(s.id,cle(s)), joueur=(s.joueur&&vers[s.joueur])||'';
    S.staff.push({id,prenom:s.prenom||'',nom:s.nom||'',licence:s.licence||'',annee:s.annee||'',
      commune:s.commune||'',joueur,
      mails:normContacts(s.mails&&s.mails.length?s.mails:(s.mail?[s.mail]:[]),'mail'),
      tels:normContacts(s.tels&&s.tels.length?s.tels:(s.tel?[s.tel]:[]),'tel')});
    if(joueur&&P(joueur))P(joueur).coach=true;
    /* comme à la création d'un coach : présent par défaut sur tous les matchs */
    S.matches.forEach(m=>{m.staff=m.staff||[];if(!m.staff.includes(id))m.staff.push(id)});
    res.coachs++;
  });
  if(replace)pruneRefs();
  const st=data.settings||{};
  if(!S.settings.equipe&&st.equipe)S.settings.equipe=String(st.equipe);
  if(!salles().length&&Array.isArray(st.salles)){
    st.salles.forEach(x=>{
      const nom=registerSalle(typeof x==='string'?x:x&&x.nom);
      if(nom&&x&&x.adresse)salles().find(y=>y.nom===nom).adresse=String(x.adresse);
    });
    if(st.salleDef&&salles().some(y=>y.nom===st.salleDef))S.settings.salleDef=st.salleDef;
    res.salles=salles().length;
  }
  return res;
}
