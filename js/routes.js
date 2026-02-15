function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}
export async function loadRoutesIndex(){
  const res = await fetch(new URL('data/routes.json', document.baseURI).toString(), { cache: 'no-store' });
  if(!res.ok) throw new Error('No se pudo cargar data/routes.json');
  const data = await res.json();
  if(!data || !Array.isArray(data.routes)) throw new Error('routes.json inválido');
  return data;
}
export function renderSelectRoute(root, routesIndex, currentRoute){
  root.replaceChildren();
  const container = makeEl('div','container','');
  const card = makeEl('section','card pad','');
  card.appendChild(makeEl('h1','h1','Selecciona tu ruta de tapas'));
  card.appendChild(makeEl('p','p','Elige una ruta precargada. Puedes añadir nuevas rutas colocando nuevos JSON en /data.'));
  const field = makeEl('div','field','');
  const lab = makeEl('label','label','Buscar ruta'); lab.setAttribute('for','inpSearch');
  const inp = document.createElement('input'); inp.className='input'; inp.id='inpSearch'; inp.type='text'; inp.placeholder='Ej: Granada, Málaga...';
  field.appendChild(lab); field.appendChild(inp);
  const list = makeEl('div','list','');
  function renderList(filter){
    list.replaceChildren();
    const f=(filter||'').toLowerCase();
    const routes = routesIndex.routes.filter(r => (r.title||'').toLowerCase().includes(f));
    routes.forEach(r=>{
      const item=makeEl('button','item',''); item.type='button';
      const meta=makeEl('div','meta',''); meta.appendChild(makeEl('div','title', r.title||r.id)); meta.appendChild(makeEl('div','sub','Ruta precargada'));
      const right=makeEl('div','right',''); right.appendChild(makeEl('div','chip', (currentRoute&&currentRoute.id===r.id)?'Actual':'Cargar'));
      item.appendChild(meta); item.appendChild(right);
      item.addEventListener('click',(e)=>{ e.preventDefault(); window.location.hash='#/ruta?r='+encodeURIComponent(r.id); });
      list.appendChild(item);
    });
    if(routes.length===0){
      const empty=makeEl('div','item',''); const m=makeEl('div','meta','');
      m.appendChild(makeEl('div','title','Sin resultados')); m.appendChild(makeEl('div','sub','Prueba con otro texto.'));
      empty.appendChild(m); list.appendChild(empty);
    }
  }
  inp.addEventListener('input', ()=>renderList(inp.value));
  const actions=makeEl('div','row spread','');
  const back=makeEl('a','btn btn-ghost','Volver'); back.href='#/ruta';
  const prof=makeEl('a','btn','Perfil'); prof.href='#/perfil';
  actions.appendChild(back); actions.appendChild(prof);
  card.appendChild(field); card.appendChild(list); card.appendChild(actions);
  container.appendChild(card); root.appendChild(container);
  renderList('');
}
