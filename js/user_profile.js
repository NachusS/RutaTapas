function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}

function safeJSONParse(str){
  try { return JSON.parse(str); } catch { return null; }
}

function getProfile(){
  const raw = localStorage.getItem('rt_profile');
  const p = raw ? safeJSONParse(raw) : null;
  if(p && p.name) return p;
  return null;
}

function getProgress(routeId){
  const raw = localStorage.getItem('rt_progress_' + routeId);
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  return { startedAt:null, finishedAt:null, completedStopIds:[], stopRatings:{}, routeRating:0 };
}

function getFavorites(routeId){
  const raw = localStorage.getItem('rt_favorites_' + routeId);
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  return {};
}

function countFavs(favsObj){
  return Object.values(favsObj || {}).filter(Boolean).length;
}

function avgRatingFromProgress(prog){
  const vals = Object.values(prog.stopRatings || {}).map(n => Number(n || 0)).filter(n => n > 0);
  if(vals.length === 0) return 0;
  const sum = vals.reduce((a,b)=>a+b,0);
  return Math.round((sum/vals.length) * 10) / 10;
}

function getSlogan(metrics){
  // sencillo + motivador
  if(metrics.routesCompleted >= 10) return '¡Leyenda del tapeo! Sigue conquistando barras.';
  if(metrics.routesCompleted >= 3) return 'Vas lanzado. Hoy toca una tapa nueva.';
  if(metrics.stopsCompleted >= 10) return 'Buen ritmo. Cada parada cuenta.';
  return 'Empieza fuerte: elige una ruta y a tapear.';
}

function metricCard(label, value, icon){
  const box = makeEl('div','metric','');
  const ico = makeEl('div','metric-ico', icon);
  const v = makeEl('div','metric-val', String(value));
  const l = makeEl('div','metric-lab', label);
  box.appendChild(ico); box.appendChild(v); box.appendChild(l);
  return box;
}

function buildLevel(points){
  // Nivel simple por puntos
  // 10 pts por parada, 50 por ruta, 5 por favorito, 2 por valoración
  const level = Math.max(1, Math.floor(points / 250) + 1);
  const nextAt = level * 250;
  const pct = Math.min(100, Math.round((points / nextAt) * 100));
  return { level, nextAt, pct };
}

export function renderUserProfile(root, routesIndex){
  root.replaceChildren();

  const container = makeEl('div','container','');
  const card = makeEl('section','card pad profile-card','');

  const headerRow = makeEl('div','row spread','');
  const back = makeEl('a','btn btn-ghost','← Volver');
  back.href = '#/ruta';
  const edit = makeEl('a','btn','Editar perfil');
  edit.href = '#/perfil';
  headerRow.appendChild(back);
  headerRow.appendChild(edit);

  const title = makeEl('h1','h1','Mi Perfil');

  const prof = getProfile();
  const top = makeEl('div','profile-top','');
  const avatarWrap = makeEl('div','avatar-wrap','');
  const avatar = document.createElement('img');
  avatar.className = 'avatar-img';
  avatar.alt = 'Foto de perfil';
  if(prof && prof.photoDataUrl) avatar.src = prof.photoDataUrl;
  else if(prof && prof.avatar) avatar.src = prof.avatar;
  else avatar.src = 'assets/images/avatares/avatar_01.jpg';
  avatarWrap.appendChild(avatar);

  const nameBox = makeEl('div','profile-namebox','');
  const name = makeEl('div','profile-name', prof ? prof.name : 'Invitado');
  const small = makeEl('div','small', 'Tu progreso se guarda en este dispositivo.');
  nameBox.appendChild(name);
  nameBox.appendChild(small);

  top.appendChild(avatarWrap);
  top.appendChild(nameBox);

  const routes = (routesIndex && routesIndex.routes) ? routesIndex.routes : [];
  let routesCompleted = 0;
  let stopsCompleted = 0;
  let favsTotal = 0;
  let ratedStops = 0;
  let bestAvg = 0;

  routes.forEach(r => {
    const prog = getProgress(r.id);
    stopsCompleted += (prog.completedStopIds || []).length;
    const favs = getFavorites(r.id);
    favsTotal += countFavs(favs);
    const avg = avgRatingFromProgress(prog);
    bestAvg = Math.max(bestAvg, avg);
    ratedStops += Object.values(prog.stopRatings || {}).map(n => Number(n||0)).filter(n => n > 0).length;

    // heurística de "ruta completada": si hay finishedAt o si completó >= 80% de paradas conocidas (si las tienes en JSON no aquí)
    if(prog.finishedAt) routesCompleted += 1;
    else if((prog.completedStopIds || []).length >= 5) routesCompleted += 1; // fallback razonable sin conocer total
  });

  const points = (stopsCompleted * 10) + (routesCompleted * 50) + (favsTotal * 5) + (ratedStops * 2);
  const lvl = buildLevel(points);

  const slogan = makeEl('p','p', getSlogan({ routesCompleted, stopsCompleted }));

  const levelRow = makeEl('div','level-row','');
  const levelBadge = makeEl('div','badge','Nivel ' + lvl.level);
  const pts = makeEl('div','small', points + ' pts · ' + lvl.nextAt + ' para el siguiente nivel');
  levelRow.appendChild(levelBadge);
  levelRow.appendChild(pts);

  const progWrap = makeEl('div','progress-wrap','');
  const bar = makeEl('div','progressbar','');
  const fill = document.createElement('div');
  fill.style.width = lvl.pct + '%';
  bar.appendChild(fill);
  progWrap.appendChild(bar);

  const metrics = makeEl('div','metrics-grid','');
  metrics.appendChild(metricCard('Rutas completadas', routesCompleted, '🧭'));
  metrics.appendChild(metricCard('Paradas completadas', stopsCompleted, '📍'));
  metrics.appendChild(metricCard('Bares favoritos', favsTotal, '♥'));
  metrics.appendChild(metricCard('Media mejor ruta', bestAvg ? (bestAvg + '★') : '—', '★'));

  const medals = makeEl('div','medals','');
  const medalsHeader = makeEl('div','row spread','');
  medalsHeader.appendChild(makeEl('h2','h2','Mis logros'));
  medalsHeader.appendChild(makeEl('div','small', 'Progreso: ' + Math.min(24, Math.max(0, Math.floor(points/120))) + '/24'));
  medals.appendChild(medalsHeader);

  const medalsGrid = makeEl('div','medals-grid','');
  const items = [
    { label:'Ruta Completa', icon:'🏆', unlocked: routesCompleted >= 1 },
    { label:'Explorador', icon:'🧭', unlocked: stopsCompleted >= 10 },
    { label:'Amante del Picante', icon:'🔥', unlocked: ratedStops >= 3 },
    { label:'Favoritos', icon:'♥', unlocked: favsTotal >= 3 },
    { label:'Crítico', icon:'★', unlocked: ratedStops >= 10 },
    { label:'Leyenda', icon:'👑', unlocked: routesCompleted >= 10 }
  ];
  items.forEach(it => {
    const b = makeEl('div','medal ' + (it.unlocked ? 'is-on' : 'is-off'),'');
    const c = makeEl('div','medal-circle', it.icon);
    const t = makeEl('div','medal-title', it.label);
    b.appendChild(c); b.appendChild(t);
    medalsGrid.appendChild(b);
  });
  medals.appendChild(medalsGrid);

  card.appendChild(headerRow);
  card.appendChild(title);
  card.appendChild(top);
  card.appendChild(slogan);
  card.appendChild(levelRow);
  card.appendChild(progWrap);
  card.appendChild(makeEl('hr','hr',''));
  card.appendChild(metrics);
  card.appendChild(makeEl('hr','hr',''));
  card.appendChild(medals);

  container.appendChild(card);
  root.appendChild(container);
}
