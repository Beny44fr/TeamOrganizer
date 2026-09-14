/* Estimation des temps de trajet vers les matchs à l'extérieur, et liens
   Google Maps. */
import {S} from '../core/state.js';
import {cap, normTxt} from '../core/utils.js';
import {salles} from './model.js';

/* communes du secteur, pour estimer les trajets */
const COMMUNES=[
 ['MONTBERT',47.0442,-1.4867],['GENESTON',47.0119,-1.4936],['LE BIGNON',47.0692,-1.4767],
 ['LA PLANCHE',47.0044,-1.4406],['VIEILLEVIGNE',47.0033,-1.4008],['REMOUILLE',47.0439,-1.3825],
 ['AIGREFEUILLE SUR MAINE',47.0839,-1.4025],['MAISDON SUR SEVRE',47.0958,-1.3572],
 ['CHATEAU THEBAUD',47.1108,-1.4319],['SAINT FIACRE SUR MAINE',47.135,-1.3939],
 ['MONNIERES',47.1247,-1.3564],['LE PALLET',47.1467,-1.32],['MOUZILLON',47.1425,-1.2778],
 ['LA HAYE FOUASSIERE',47.1667,-1.3936],['LA CHAPELLE HEULIN',47.1408,-1.3428],
 ['GORGES',47.1017,-1.3025],['CLISSON',47.0872,-1.2811],['GETIGNE',47.0664,-1.2683],
 ['SAINT HILAIRE DE CLISSON',47.0533,-1.2681],['CUGAND',47.0619,-1.2803],['BOUSSAY',47.0053,-1.1958],
 ['VALLET',47.1614,-1.2678],['LE LOROUX BOTTEREAU',47.2372,-1.3494],
 ['SAINT JULIEN DE CONCELLES',47.2431,-1.3839],['HAUTE GOULAINE',47.1908,-1.4139],
 ['BASSE GOULAINE',47.2094,-1.4611],['VERTOU',47.1686,-1.4686],
 ['SAINT SEBASTIEN SUR LOIRE',47.2081,-1.5011],['LES SORINIERES',47.1522,-1.5286],
 ['REZE',47.1833,-1.5667],['NANTES',47.2184,-1.5536],['BOUGUENAIS',47.1717,-1.6236],
 ['SAINT HERBLAIN',47.2172,-1.6472],['ORVAULT',47.2711,-1.6217],['CARQUEFOU',47.2986,-1.4936],
 ['SAINTE LUCE SUR LOIRE',47.2508,-1.4831],['COUERON',47.2153,-1.7222],
 ['PONT SAINT MARTIN',47.1189,-1.5825],['SAINT AIGNAN GRANDLIEU',47.1219,-1.6208],
 ['LA CHEVROLIERE',47.0642,-1.6242],['BOUAYE',47.145,-1.69],['SAINT COLOMBAN',47.0006,-1.5486],
 ['LA LIMOUZINIERE',46.9761,-1.6083],['CORCOUE SUR LOGNE',46.9411,-1.5644],
 ['SAINT PHILBERT DE GRAND LIEU',47.0342,-1.6417],['SAINT LUMINE DE COUTAIS',47.0069,-1.7192],
 ['ROCHESERVIERE',46.9364,-1.5108],['LEGE',46.8858,-1.6019],['MACHECOUL',46.9925,-1.8231],
 ['MONTAIGU',46.9758,-1.3103],['LES HERBIERS',46.8686,-1.0139],['CHOLET',47.0594,-0.8792],
 ['ANCENIS',47.3667,-1.1772],['PORNIC',47.1122,-2.1],['SAINT NAZAIRE',47.2733,-2.2136],
 ['CHALLANS',46.8447,-1.8778],['LA ROCHE SUR YON',46.6705,-1.426],['GUERANDE',47.3286,-2.4292]
];

function findCommune(txt){
  const t=' '+normTxt(txt)+' ';
  let best=null;
  COMMUNES.forEach(c=>{
    if(t.includes(' '+c[0]+' ')&&(!best||c[0].length>best[0].length))best=c;
  });
  return best;
}

function haversine(a,b){
  const R=6371,r=Math.PI/180;
  const dl=(b[1]-a[1])*r, dp=(b[2]-a[2])*r;
  const x=Math.sin(dl/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dp/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}

/* renvoie {min, why} ou null */
/* lien Google Maps : itinéraire pour un déplacement, simple repère à domicile */
export function mapsUrl(m){
  const E=encodeURIComponent;
  const dest=String(m.adresse||m.salle||'').trim();
  if(!dest)return null;
  if(m.lieu==='domicile')
    return 'https://www.google.com/maps/search/?api=1&query='+E(dest);
  const sa=salles().find(x=>x.nom===m.depart);
  const orig=String((sa&&sa.adresse)||m.depart||'').trim();
  if(!orig)return 'https://www.google.com/maps/search/?api=1&query='+E(dest);
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+E(orig)+'&destination='+E(dest);
}

/* destTxt = l'adresse du match : c'est elle qui porte la commune d'arrivée */
export function estimTrajet(depart,destTxt,skipId){
  const dk=normTxt(depart);
  if(!normTxt(destTxt))return null;
  const b=findCommune(destTxt);
  if(!b)return null;
  /* 1. un match précédent dans la même commune, depuis la même salle */
  const prev=S.matches.find(m=>{
    if(m.id===skipId||m.lieu!=='exterieur'||!(+m.trajet>0))return false;
    if(normTxt(m.depart)!==dk)return false;
    const pc=findCommune(m.adresse||'');
    return pc&&pc[0]===b[0];
  });
  if(prev)return {min:+prev.trajet,why:'durée déjà utilisée pour '+(prev.adversaire||'un match précédent')};
  /* 2. distance à vol d'oiseau entre communes connues. La commune de départ se
     lit dans l'adresse de la salle, à défaut dans son nom : « Gymnase Nord »
     ne dit rien, « 1 rue du Stade, 44140 Montbert » si. */
  const sa=salles().find(x=>x.nom===depart);
  const a=findCommune((sa&&sa.adresse)||'')||findCommune(depart);
  if(!a)return null;
  const km=haversine(a,b)*1.28;
  if(km<1)return {min:10,why:'même commune'};
  const v=48+Math.min(24,km/2.2);
  const min=Math.max(10,Math.round(km/v*60/5)*5);
  return {min,why:'≈ '+Math.round(km)+' km, '+cap(a[0])+' → '+cap(b[0])};
}
