function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}

function safeJSONParse(str){
  try { return JSON.parse(str); } catch { return null; }
}

function getProgress(routeId){
  const raw = localStorage.getItem('rt_progress_' + routeId);
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  return { startedAt:null, finishedAt:null, completedStopIds:[], stopRatings:{}, routeRating:0 };
}

function avgStopRating(prog){
  const vals = Object.values(prog.stopRatings || {}).map(n => Number(n || 0)).filter(n => n > 0);
  if(vals.length === 0) return 0;
  const sum = vals.reduce((a,b)=>a+b,0);
  return Math.round((sum/vals.length) * 10) / 10;
}

export function renderDashboard(root, routesIndex){
  root.replaceChildren();
  const container = makeEl('div','container','');
  const grid = makeEl('div','grid cols2','');

  const left = makeEl('section','card pad','');
  left.appendChild(makeEl('h1','h1','Dashboard del usuario'));
  left.appendChild(makeEl('p','p','Resumen de tus rutas, paradas completadas y valoraciones.'));

  const routes = (routesIndex && routesIndex.routes) ? routesIndex.routes : [];
  let totalStopsDone = 0;
  let best = { title:'—', score:0 };

  const list = makeEl('div','list','');
  routes.forEach(r => {
    const prog = getProgress(r.id);
    const done = prog.completedStopIds.length;
    totalStopsDone += done;

    const score = avgStopRating(prog);
    if(score > best.score) best = { title: r.title || r.id, score };

    const item = makeEl('div','item','');
    const meta = makeEl('div','meta','');
    meta.appendChild(makeEl('div','title', r.title || r.id));
    meta.appendChild(makeEl('div','sub', 'Paradas completadas: ' + done));

    const right = makeEl('div','right','');
    right.appendChild(makeEl('div','chip', score ? (score + '★ media') : 'Sin valorar'));

    const go = makeEl('a','btn btn-ghost','Abrir');
    go.href = '#/ruta?r=' + encodeURIComponent(r.id);
    go.style.padding = '.8rem 1.0rem';
    go.style.borderRadius = '1.2rem';
    right.appendChild(go);

    item.appendChild(meta);
    item.appendChild(right);
    list.appendChild(item);
  });

  const stats = makeEl('div','row','');
  stats.appendChild(makeEl('div','badge', 'Paradas visitadas: ' + totalStopsDone));
  stats.appendChild(makeEl('div','badge', 'Mejor ruta: ' + best.title + (best.score ? (' (' + best.score + '★)') : '')));

  left.appendChild(stats);
  left.appendChild(document.createElement('hr')).className = 'hr';
  left.appendChild(list);

  const right = makeEl('section','card pad','');
  right.appendChild(makeEl('h2','h2','Acciones rápidas'));
  right.appendChild(makeEl('p','p','Gestiona tu perfil o reinicia el progreso de una ruta (solo en este dispositivo).'));

  const btnProfile = makeEl('a','btn btn-primary','Editar perfil');
  btnProfile.href = '#/perfil';
  const btnSelect = makeEl('a','btn','Seleccionar ruta');
  btnSelect.href = '#/seleccionar';

  right.appendChild(btnProfile);
  right.appendChild(btnSelect);
  right.appendChild(document.createElement('hr')).className = 'hr';

  const resetWrap = makeEl('div','field','');
  const l = makeEl('label','label','Reiniciar progreso de ruta');
  l.setAttribute('for','selReset');
  const sel = document.createElement('select');
  sel.className = 'select';
  sel.id = 'selReset';

  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Selecciona una ruta…';
  sel.appendChild(opt0);

  routes.forEach(r => {
    const o = document.createElement('option');
    o.value = r.id;
    o.textContent = r.title || r.id;
    sel.appendChild(o);
  });

  const btnReset = makeEl('button','btn btn-danger','Reiniciar');
  btnReset.type = 'button';

  resetWrap.appendChild(l);
  resetWrap.appendChild(sel);
  right.appendChild(resetWrap);
  right.appendChild(btnReset);

  btnReset.addEventListener('click', (e)=>{
    e.preventDefault();
    const id = sel.value;
    if(!id){
      if(window.RT_TOAST) window.RT_TOAST('Selecciona una ruta para reiniciar.');
      return;
    }
    localStorage.removeItem('rt_progress_' + id);
    if(window.RT_TOAST) window.RT_TOAST('Progreso reiniciado para la ruta seleccionada.');
    renderDashboard(root, routesIndex);
  });

  grid.appendChild(left);
  grid.appendChild(right);
  container.appendChild(grid);
  root.appendChild(container);
}
