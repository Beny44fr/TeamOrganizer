/* Utilitaires sans rapport avec le métier : échappement HTML, vocabulaire
   selon le pointeur, identifiants, dates et heures. */

export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* « Touchez » au doigt, « Cliquez » à la souris : les explications suivent le
   matériel au lieu d'imposer le vocabulaire du téléphone sur un ordinateur. */
export const COARSE=(()=>{try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}})();

export const TAP=COARSE?'Touchez':'Cliquez', tap=COARSE?'touchez':'cliquez';

export function uid(){return Math.random().toString(36).slice(2,10)}

export function normHeure(h){
  if(!h)return '';
  const m=/^(\d{1,2})\s*[h:.]\s*(\d{0,2})$/.exec(String(h).trim());
  if(!m)return String(h);
  return String(+m[1]).padStart(2,'0')+':'+(m[2]||'00').padEnd(2,'0');
}

export function toMin(t){if(!t)return null;const m=/^(\d{1,2})[h:.](\d{2})$/.exec(String(t).trim());return m?+m[1]*60+ +m[2]:null}

export function toHM(v){if(v==null)return '—';v=((v%1440)+1440)%1440;return String(Math.floor(v/60)).padStart(2,'0')+'h'+String(v%60).padStart(2,'0')}

export function frDate(d){const dt=new Date(d+'T12:00:00');return isNaN(dt)?(d||''):dt.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}

export function dayNum(d){const dt=new Date(d+'T12:00:00');return isNaN(dt)?'?':dt.getDate()}

export function dayName(d){const dt=new Date(d+'T12:00:00');return isNaN(dt)?'':dt.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')}

export function rel(d){
  const t=new Date();t.setHours(12,0,0,0);
  const dt=new Date(d+'T12:00:00'); if(isNaN(dt))return '';
  const j=Math.round((dt-t)/86400000);
  if(j===0)return "aujourd'hui"; if(j===1)return 'demain';
  if(j>1&&j<8)return dt.toLocaleDateString('fr-FR',{weekday:'long'});
  if(j>=8&&j<31)return 'dans '+j+' jours';
  return '';
}

/* Date du jour au format AAAA-MM-JJ, en heure locale. toISOString() donnerait
   la date UTC : en France, encore la veille entre minuit et 1 ou 2 h du matin. */
export const aujourdhui=()=>{
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
};

export const normTxt=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();

export const cap=s=>String(s).toLowerCase().replace(/(^|[\s-])\w/g,c=>c.toUpperCase());
