/* Planification de plusieurs matchs d'un coup, avec aperçu avant
   application. */
import {I} from '../core/icons.js';
import {S, save, setS} from '../core/state.js';
import {aujourdhui, esc} from '../core/utils.js';
import {eligible, isReady, nbTransport, pre, sortedMatches} from '../domain/model.js';
import {counts, planCompute} from '../domain/roulements.js';
import {sheet, snap, toast} from '../ui/components.js';
import {render} from './layout.js';

export const planActions={
 plan(){
   const today=aujourdhui();
   const dispo=sortedMatches().filter(m=>(m.date||'')>=today);
   if(!dispo.length){toast('Aucun match à venir');return}
   const st={
     ids:new Set(dispo.filter(m=>!isReady(m)).map(m=>m.id)),
     tasks:{transport:true,bar:true,lavage:true},
     mode:'fill', convoquer:false
   };
   if(!st.ids.size)dispo.forEach(m=>st.ids.add(m.id));

   const ov=sheet('Planifier plusieurs matchs',`<div id="pl"></div>`,()=>{});
   const box=ov.querySelector('#pl');

   function draw(){
     const ids=[...st.ids];
     const res=ids.length?planCompute(ids,st.tasks,st.mode,st.convoquer):null;
     const cl=res&&res.clone;
     const nm=(a,n)=>!a||!a.length?'<span class="miss">—</span>'
       :a.map(id=>esc(pre(id))).join(', ')+(a.length<n?' <span class="miss">+'+(n-a.length)+'</span>':'');
     const lignes=cl?res.ordre.map(id=>{
       const m=cl.matches.find(x=>x.id===id), o=S.matches.find(x=>x.id===id), dom=m.lieu==='domicile';
       const chg=k=>((m[k]||[]).join()!==((o&&o[k])||[]).join())?' class="chg"':'';
       const d=new Date(m.date+'T12:00:00');
       return `<tr>
         <td class="mt"><b>${esc(m.adversaire||'?')}</b><span class="sub">${isNaN(d)?'':d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})} · ${dom?'dom.':'ext.'}</span></td>
         <td${chg(dom?'bar':'transport')}>${dom?nm(m.bar,2):nm(m.transport,nbTransport(m))}</td>
         <td${chg('lavage')}>${nm(m.lavage,1)}</td>
       </tr>`;
     }).join(''):'';

     /* équité obtenue après application */
     let bilan='';
     if(cl){
       const back=S;setS(cl);const c=counts(null);setS(back);
       const el=eligible().map(p=>c[p.id].total);
       if(el.length)bilan=`Après application : écart de ${Math.max(...el)-Math.min(...el)} tour(s) entre familles.`;
     }

     box.innerHTML=`
     <div class="card"><div class="card-b">
       <div class="f"><span>Matchs concernés — ${st.ids.size} sur ${dispo.length}</span>
         <div class="row" style="gap:14px;margin-bottom:8px">
           <button class="link subtle" data-act="all">Tous</button>
           <button class="link subtle" data-act="none">Aucun</button>
           <button class="link subtle" data-act="todo">Ceux à compléter</button>
         </div>
         <div class="pllist">${dispo.map(m=>{
           const d=new Date(m.date+'T12:00:00');
           return `<label class="plitem"><input type="checkbox" data-id="${m.id}"${st.ids.has(m.id)?' checked':''}>
             <span><b>${esc(m.adversaire||'?')}</b><span class="sub">${isNaN(d)?'':d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'})} · ${m.lieu==='domicile'?'domicile':'extérieur'}${isReady(m)?' · complet':''}</span></span></label>`;
         }).join('')}</div>
       </div>
       <div class="f"><span>Tours à attribuer</span>
         <div class="chips">
           <button class="chip" data-task="transport" data-on="${st.tasks.transport?1:0}">${I('car',15)} Transport</button>
           <button class="chip" data-task="bar" data-on="${st.tasks.bar?1:0}">${I('cup',15)} Bar</button>
           <button class="chip" data-task="lavage" data-on="${st.tasks.lavage?1:0}">${I('shirt',15)} Maillots</button>
         </div>
       </div>
       <div class="f"><span>Méthode</span>
         <div class="seg meth">
           <button type="button" data-mode="fill" aria-pressed="${st.mode==='fill'}">${I('plus',16)} Compléter</button>
           <button type="button" data-mode="all" aria-pressed="${st.mode==='all'}">${I('refresh',16)} Tout refaire</button>
         </div>
         <p class="tiny" style="margin-top:7px">${st.mode==='fill'
           ?'Les désignations déjà faites sont conservées, seules les places vides sont pourvues.'
           :'Les désignations existantes sont effacées et recalculées.'}</p>
       </div>
       <label class="check" style="margin-bottom:4px"><input type="checkbox" data-conv${st.convoquer?' checked':''}> Convoquer tout l'effectif si aucun joueur n'est convoqué</label>
     </div></div>

     <div class="sec-title">${I('scale',17)} Aperçu</div>
     <div class="card">
       ${st.ids.size?`<div class="tbl-wrap"><table class="recap plprev">
         <thead><tr><th class="mt">Match</th><th>Transport / Bar</th><th>${I('shirt',14)} Maillots</th></tr></thead>
         <tbody>${lignes}</tbody></table></div>`
        :'<div class="empty">Sélectionnez au moins un match.</div>'}
     </div>
     ${bilan?`<p class="tiny" style="margin-top:9px">${esc(bilan)} Les lignes surlignées sont celles qui changent.</p>`:''}
     <button class="btn wide" style="margin-top:14px" data-act="apply"${st.ids.size?'':' disabled'}>${I('check',18)} Appliquer à ${st.ids.size} match${st.ids.size>1?'s':''}</button>`;

     box.querySelectorAll('input[type=checkbox][data-id]').forEach(cb=>{
       cb.onchange=()=>{cb.checked?st.ids.add(cb.dataset.id):st.ids.delete(cb.dataset.id);draw()};
     });
     box.querySelectorAll('[data-task]').forEach(b=>{
       b.onclick=()=>{st.tasks[b.dataset.task]=!st.tasks[b.dataset.task];draw()};
     });
     box.querySelectorAll('[data-mode]').forEach(b=>{
       b.onclick=()=>{st.mode=b.dataset.mode;draw()};
     });
     const cv=box.querySelector('[data-conv]');
     if(cv)cv.onchange=()=>{st.convoquer=cv.checked;draw()};
     box.querySelectorAll('[data-act]').forEach(b=>{
       b.onclick=()=>{
         const a=b.dataset.act;
         if(a==='all'){dispo.forEach(m=>st.ids.add(m.id));draw()}
         else if(a==='none'){st.ids.clear();draw()}
         else if(a==='todo'){st.ids.clear();dispo.filter(m=>!isReady(m)).forEach(m=>st.ids.add(m.id));draw()}
         else if(a==='apply'){
           const avantPlan=snap();
           const r=planCompute([...st.ids],st.tasks,st.mode,st.convoquer);
           r.ordre.forEach(id=>{
             const src=r.clone.matches.find(x=>x.id===id), dst=S.matches.find(x=>x.id===id);
             if(!src||!dst)return;
             ['convoques','absents','transport','bar','lavage'].forEach(k=>dst[k]=(src[k]||[]).slice());
           });
           save();ov.remove();render();
           toast(r.ordre.length+' match'+(r.ordre.length>1?'s planifiés':' planifié'),'check',avantPlan);
         }
       };
     });
   }
   draw();
 },
};
