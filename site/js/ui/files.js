/* Fichiers : lecture Excel/CSV (bibliothèque SheetJS chargée à la demande),
   zones de dépôt, téléchargements. */
import {I} from '../core/icons.js';
import {COARSE} from '../core/utils.js';
import {toast} from './components.js';

let xp=null;

export function loadXLSX(){
  if(window.XLSX)return Promise.resolve(window.XLSX);
  if(xp)return xp;
  xp=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>window.XLSX?res(window.XLSX):rej(new Error('x'));
    s.onerror=()=>rej(new Error('cdn'));
    document.head.appendChild(s);
  });
  return xp;
}

export function splitLines(txt){
  const lines=txt.split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length)return [];
  const sep=lines[0].includes('\t')?'\t':(lines[0].includes(';')?';':(lines[0].includes(',')?',':'\t'));
  return lines.map(l=>l.split(sep).map(x=>x.trim().replace(/^"|"$/g,'')));
}

function fmtCell(v){
  if(v==null)return '';
  if(v instanceof Date){
    const p=n=>String(n).padStart(2,'0');
    if(v.getHours()||v.getMinutes())return p(v.getHours())+':'+p(v.getMinutes());
    return p(v.getDate())+'/'+p(v.getMonth()+1)+'/'+v.getFullYear();
  }
  return String(v).trim();
}

/* lit un fichier et renvoie un tableau de lignes (tableaux de chaînes) */
function readFile(file,prefer){
  const n=(file.name||'').toLowerCase();
  if(/\.(xlsx|xlsm|xls)$/.test(n)){
    return loadXLSX().then(X=>new Promise((res,rej)=>{
      const fr=new FileReader();
      fr.onload=()=>{
        try{
          const wb=X.read(new Uint8Array(fr.result),{type:'array',cellDates:true});
          const nm=wb.SheetNames.find(s=>s.toLowerCase().startsWith(prefer))||wb.SheetNames[0];
          const aoa=X.utils.sheet_to_json(wb.Sheets[nm],{header:1,raw:false,dateNF:'dd/mm/yyyy'});
          res(aoa.map(r=>(r||[]).map(fmtCell)).filter(r=>r.some(x=>x!=='')));
        }catch(e){rej(e)}
      };
      fr.onerror=()=>rej(new Error('lecture'));
      fr.readAsArrayBuffer(file);
    }));
  }
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>res(splitLines(String(fr.result)));
    fr.onerror=()=>rej(new Error('lecture'));
    fr.readAsText(file,'utf-8');
  });
}

/* Rend une zone cliquable (ouvre le sélecteur de fichier) et accepte le
   glisser-déposer ; onFile reçoit le fichier choisi. */
export function wireDrop(dz,onFile){
  const inp=dz.querySelector('input[type=file]');
  dz.onclick=e=>{if(e.target!==inp)inp.click()};
  inp.onchange=()=>onFile(inp.files[0]);
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('over')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('over')}));
  dz.addEventListener('drop',e=>onFile(e.dataTransfer.files[0]));
}
/* onJson, facultatif : reçoit le contenu d'un fichier .json déjà décodé et
   renvoie le texte à afficher sous la zone. */
export function dropZone(id,prefer,onRows,onJson){
  const dz=document.getElementById(id);
  if(!dz)return;
  const handle=f=>{
    if(!f)return;
    if(onJson&&/\.json$/i.test(f.name||'')){
      const fr=new FileReader();
      fr.onload=()=>{
        let d;
        try{d=JSON.parse(String(fr.result))}
        catch(e){dz.querySelector('.dzt').textContent='Fichier illisible';toast('Ce fichier n\u2019est pas du JSON valide');return}
        dz.querySelector('.dzt').textContent=f.name+' — '+onJson(d);
      };
      fr.onerror=()=>{dz.querySelector('.dzt').textContent='Lecture impossible'};
      fr.readAsText(f,'utf-8');
      return;
    }
    dz.querySelector('.dzt').textContent='Lecture de '+f.name+'…';
    readFile(f,prefer).then(rows=>{
      dz.querySelector('.dzt').textContent=f.name+' — '+rows.length+' ligne(s) lues';
      onRows(rows);
    }).catch(e=>{
      dz.querySelector('.dzt').textContent='Lecture impossible';
      toast(e.message==='cdn'?'Fichier Excel illisible hors ligne, collez les lignes':'Fichier illisible');
    });
  };
  wireDrop(dz,handle);
}

export const dzHtml=(id,txt,accept)=>`<div class="drop" id="${id}">
  <div class="dz-ic">${I('up',28)}</div>
  <b>${COARSE?'Choisissez votre fichier':'Déposez votre fichier ici'}</b>
  <div class="tiny dzt">${txt}</div>
  <input type="file" accept="${accept||'.xlsx,.xlsm,.xls,.csv,.tsv,.txt'}" style="display:none">
</div>`;

export function download(nom,contenu,type){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([contenu],{type:type||'text/plain;charset=utf-8'}));
  a.download=nom;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
