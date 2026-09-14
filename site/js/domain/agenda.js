/* Export du calendrier au format iCalendar (.ics). */
import {S} from '../core/state.js';
import {toMin} from '../core/utils.js';
import {msgOf} from './message.js';
import {times} from './model.js';

function icsStamp(dateStr,minutes){
  if(!dateStr||minutes==null)return null;
  const d=new Date(dateStr+'T00:00:00');
  if(isNaN(d))return null;
  d.setMinutes(((minutes%1440)+1440)%1440);
  if(minutes<0)d.setDate(d.getDate()-1);
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'T'+p(d.getHours())+p(d.getMinutes())+'00';
}

function icsEsc(t){return String(t||'').replace(/\\/g,'\\\\').replace(/[,;]/g,c=>'\\'+c).replace(/\r?\n/g,'\\n')}

export function buildIcs(list){
  const now=new Date(), p=n=>String(n).padStart(2,'0');
  const stamp=now.getUTCFullYear()+p(now.getUTCMonth()+1)+p(now.getUTCDate())+'T'
    +p(now.getUTCHours())+p(now.getUTCMinutes())+p(now.getUTCSeconds())+'Z';
  const ev=[];
  list.forEach(m=>{
    const t=times(m), h=toMin(m.heure);
    const deb=icsStamp(m.date,t.rdv!=null?t.rdv:h);
    const fin=icsStamp(m.date,(h!=null?h:0)+100);
    if(!deb||!fin)return;
    const lieu=[m.salle,m.adresse].filter(Boolean).join(', ');
    ev.push(['BEGIN:VEVENT','UID:'+m.id+'@equipe-basket','DTSTAMP:'+stamp,
      'DTSTART:'+deb,'DTEND:'+fin,
      'SUMMARY:'+icsEsc((S.settings.equipe||'Match')+' vs '+(m.adversaire||'?')+(m.lieu==='domicile'?' (domicile)':' (extérieur)')),
      'LOCATION:'+icsEsc(lieu),
      'DESCRIPTION:'+icsEsc(msgOf(m)),
      'BEGIN:VALARM','TRIGGER:-PT60M','ACTION:DISPLAY','DESCRIPTION:'+icsEsc('Départ bientôt — '+(m.adversaire||'')),
      'END:VALARM','END:VEVENT'].join('\r\n'));
  });
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gestion equipe basket//FR','CALSCALE:GREGORIAN',
    'X-WR-CALNAME:'+icsEsc(S.settings.equipe||'Mon équipe')].concat(ev,['END:VCALENDAR']).join('\r\n');
}
