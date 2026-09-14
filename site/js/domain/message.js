/* Convocations : modèles de message et génération du texte d'un match. */
import {S} from '../core/state.js';
import {frDate, toHM, toMin} from '../core/utils.js';
import {coachName, pre, ST, times} from './model.js';

/* Formule d'accueil en tête de chaque convocation, et ligne des absents placée
   sous la liste des joueurs. Exportées pour la mise à niveau des modèles déjà
   enregistrés (voir migrate). */
export const SALUT='Bonjour à toutes et tous, voici les informations du match de ce weekend:';
export const LIGNE_ABSENTS='🚫 Absents : {absents}';

export const TPL_DOM=`${SALUT}

🏀 {equipe} — convocation
📅 {date}
🆚 {adversaire} · à domicile
📍 {salle}
🕐 Match à {heure}
⏰ Rendez-vous à {rdv} au gymnase ({avant} min avant)

Joueurs convoqués ({nb}) :
{joueurs}
${LIGNE_ABSENTS}

👤 Coachs : {coachs}
🥤 Bar : {bar}
🧺 Maillots : {lavage}

Merci de me prévenir au plus vite en cas d'absence.`;

export const TPL_EXT=`${SALUT}

🏀 {equipe} — convocation
📅 {date}
🆚 {adversaire} · à l'extérieur
📍 {salle}
{adresse}
🕐 Match à {heure}
🚗 Départ groupé à {rdv} depuis {depart} — trajet estimé {trajet} min
⏰ Arrivée sur place vers {arrivee} ({avant} min avant)

Joueurs convoqués ({nb}) :
{joueurs}
${LIGNE_ABSENTS}

👤 Coachs : {coachs}
🚗 Conducteurs : {transport}
🧺 Maillots : {lavage}

Merci de me prévenir au plus vite en cas d'absence.`;

/* m.msg, s'il existe, remplace le texte généré */
export const msgOf=m=>(m&&typeof m.msg==='string')?m.msg:buildMsg(m);

export function buildMsg(m){
  const t=times(m), st=S.settings;
  const list=(m.convoques||[]).map(id=>'· '+pre(id)).join('\n')||'—';
  const nm=a=>(a&&a.length)?a.map(id=>pre(id)).join(' · '):'à définir';
  return (m.lieu==='domicile'?st.tplDom:st.tplExt)
    .replace(/{equipe}/g,st.equipe||'')
    .replace(/{date}/g,frDate(m.date))
    .replace(/{adversaire}/g,m.adversaire||'')
    .replace(/{salle}/g,m.salle||(m.lieu==='domicile'?st.salleDef:''))
    .replace(/{adresse}/g,m.adresse||'')
    .replace(/{heure}/g,toHM(toMin(m.heure)))
    .replace(/{rdv}/g,toHM(t.rdv))
    .replace(/{arrivee}/g,toHM(t.arrivee))
    .replace(/{depart}/g,m.depart||st.salleDef||'')
    .replace(/{trajet}/g,m.trajet||0)
    .replace(/{avant}/g,st.avant)
    .replace(/{nb}/g,(m.convoques||[]).length)
    .replace(/{joueurs}/g,list)
    .replace(/{absents}/g,(m.absents||[]).length?(m.absents||[]).map(id=>pre(id)).join(' · '):'aucun')
    .replace(/{nbabs}/g,(m.absents||[]).length)
    .replace(/{transport}/g,nm(m.transport))
    .replace(/{bar}/g,nm(m.bar))
    .replace(/{lavage}/g,nm(m.lavage))
    .replace(/{coachs}|{encadrement}/g,(m.staff||[]).length
      ? (m.staff||[]).map(id=>ST(id)?coachName(id):'').filter(Boolean).join(' · ') : 'à définir')
    .replace(/\n{3,}/g,'\n\n');
}
