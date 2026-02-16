import { ensureProfile, renderWelcome, renderProfile } from './profile.js';
import { loadRoutesIndex, renderSelectRoute } from './routes.js';
import { loadRouteStops, renderActiveRoute, renderStopDetails, renderMapView } from './stops.js';
import { renderDashboard } from './dashboard.js';
import { renderUserProfile } from './user_profile.js';

const App = { state: { routesIndex: null, currentRoute: null, currentStops: null } };

function lsGet(key){
  try{ return localStorage.getItem(key); }catch(_e){ return null; }
}
function lsSet(key, value){
  try{ localStorage.setItem(key, value); }catch(_e){}
}

function qs(sel, root=document){ return root.querySelector(sel); }

function setWelcomeMode(isWelcome){
  document.body.classList.toggle('is-welcome', !!isWelcome);
}

function setActiveNav(hash){
  const links = document.querySelectorAll('.nav-link');
  links.forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href === hash);
  });
}

function setActiveTab(tab){
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(t => t.classList.toggle('is-active', (t.getAttribute('data-tab')||'') === tab));
}

function parseJSON(str, fallback){
  try{ return JSON.parse(str); }catch(_e){ return fallback; }
}
function getFavoritesKey(routeId){ return 'rt_favorites_' + routeId; }
function getFavorites(routeId){
  const raw = lsGet(getFavoritesKey(routeId));
  const obj = raw ? parseJSON(raw, null) : null;
  return (obj && typeof obj === 'object') ? obj : {};
}
function saveFavorites(routeId, favs){
  lsSet(getFavoritesKey(routeId), JSON.stringify(favs || {}));
}

function renderFavoritesView(app, routesIndex, route, data){
  app.replaceChildren();

  const wrap = document.createElement('div'); 
  wrap.className = 'container';

  const card = document.createElement('section'); 
  card.className = 'card pad';
  const h = document.createElement('h1'); 
  h.className = 'h1'; 
  h.textContent = 'Favoritos';

  const p = document.createElement('p'); 
  p.className = 'p';
  p.textContent = 'Aquí verás tus bares favoritos (guardados en este dispositivo).';

  card.appendChild(h);
  card.appendChild(p);

  // Selector de ruta (para ver favoritos de otras rutas)
  if(routesIndex && routesIndex.routes && routesIndex.routes.length){
    const field = document.createElement('div');
    field.className = 'field';
    const lab = document.createElement('label');
    lab.className = 'label';
    lab.textContent = 'Ruta';
    lab.setAttribute('for','favRouteSel');

    const sel = document.createElement('select');
    sel.className = 'select';
    sel.id = 'favRouteSel';

    routesIndex.routes.forEach(r=>{
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.title || r.id;
      if(route && r.id === route.id) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', (e)=>{
      e.preventDefault();
      const rid = sel.value;
      window.location.hash = '#/favoritos?r=' + encodeURIComponent(rid);
    });

    field.appendChild(lab);
    field.appendChild(sel);
    card.appendChild(field);
  }

  wrap.appendChild(card);

  // Lista de favoritos
  const listCard = document.createElement('section');
  listCard.className = 'card pad';

  const favs = route ? getFavorites(route.id) : {};
  const favIds = Object.keys(favs).filter(k => favs[k]);
  const stops = (data && Array.isArray(data.stops)) ? data.stops : [];

  const titleRow = document.createElement('div');
  titleRow.className = 'row spread';
  const t = document.createElement('div');
  t.className = 'h2';
  t.textContent = (route && route.title ? route.title : 'Ruta') + ' · ' + favIds.length + ' favoritos';
  titleRow.appendChild(t);

  const goRoute = document.createElement('a');
  goRoute.className = 'btn btn-ghost';
  goRoute.href = '#/ruta' + (route ? ('?r=' + encodeURIComponent(route.id)) : '');
  goRoute.textContent = 'Ir a ruta';
  titleRow.appendChild(goRoute);

  listCard.appendChild(titleRow);

  if(!route){
    const msg = document.createElement('p');
    msg.className = 'p';
    msg.textContent = 'No hay ruta seleccionada.';
    listCard.appendChild(msg);
  }else if(favIds.length === 0){
    const msg = document.createElement('p');
    msg.className = 'p';
    msg.textContent = 'Aún no has marcado bares como favoritos en esta ruta.';
    listCard.appendChild(msg);
  }else{
    const list = document.createElement('div');
    list.className = 'stops-list';

    // ordenar por order
    const byId = new Map(stops.map(s => [s.id, s]));
    const favStops = favIds.map(id => byId.get(id)).filter(Boolean).sort((a,b)=> (a.order||0)-(b.order||0));

    favStops.forEach((stop)=>{
      const item = document.createElement('div');
      item.className = 'item';
      item.dataset.stopId = stop.id;

      const img = document.createElement('img');
      img.alt = 'Foto ' + (stop.name || 'parada');
      img.src = stop.photo || 'assets/images/ui/placeholder_stop.jpg';
      img.style.width = '6.2rem';
      img.style.height = '6.2rem';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '1.8rem';
      img.style.border = '1px solid rgba(255,255,255,.08)';

      const meta = document.createElement('div');
      meta.className = 'meta';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = (stop.order ? (stop.order + '. ') : '') + (stop.name || 'Parada');
      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = stop.tapa ? ('Tapa: ' + stop.tapa) : (stop.address || '');
      meta.appendChild(title);
      meta.appendChild(sub);

      const right = document.createElement('div');
      right.className = 'right';

      const unfav = document.createElement('button');
      unfav.type = 'button';
      unfav.className = 'fav-btn';
      unfav.textContent = '♥';
      unfav.setAttribute('aria-label','Quitar de favoritos');
      unfav.addEventListener('click',(e)=>{
        e.preventDefault();
        e.stopPropagation();
        const favs2 = getFavorites(route.id);
        delete favs2[stop.id];
        saveFavorites(route.id, favs2);
        item.remove();
        // actualizar contador
        const nowCount = Object.keys(favs2).filter(k=>favs2[k]).length;
        t.textContent = (route.title || route.id) + ' · ' + nowCount + ' favoritos';
        if(window.RT_TOAST) window.RT_TOAST('Quitado de favoritos');
        if(nowCount === 0){
          // re-render para mostrar estado vacío
          renderFavoritesView(app, routesIndex, route, data);
        }
      });

      const view = document.createElement('a');
      view.className = 'btn btn-ghost';
      view.textContent = 'Ver';
      view.href = '#/parada?r=' + encodeURIComponent(route.id) + '&s=' + encodeURIComponent(stop.id);

      right.appendChild(unfav);
      right.appendChild(view);

      item.appendChild(img);
      item.appendChild(meta);
      item.appendChild(right);

      list.appendChild(item);
    });

    listCard.appendChild(list);
  }

  wrap.appendChild(listCard);
  app.appendChild(wrap);
}


function toast(message){
  const el = qs('#toast');
  if(!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(()=>{
    el.classList.add('hidden');
    el.textContent = '';
  }, 2600);
}
window.RT_TOAST = toast;


function requestGeolocationPermission(){
  if(!('geolocation' in navigator)) return;
  try{
    navigator.geolocation.getCurrentPosition(
      ()=>{},
      ()=>{},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
    );
  }catch(_e){}
}


function focusApp(){ const app = qs('#app'); if(app) app.focus(); }


function renderFatalError(err){
  const app = qs('#app');
  if(!app) return;
  app.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'container';
  const card = document.createElement('section');
  card.className = 'card pad';
  const h = document.createElement('h1');
  h.className = 'h1';
  h.textContent = 'Ups… no se pudo cargar la pantalla';
  const p = document.createElement('p');
  p.className = 'p';
  const msg = (err && err.message) ? err.message : String(err || 'Error desconocido');
  p.textContent = 'Detalle: ' + msg;
  const small = document.createElement('div');
  small.className = 'small';
  small.textContent = 'Sugerencia: revisa que existan /data/routes.json y los ficheros stops_*.json en GitHub Pages.';
  card.appendChild(h); card.appendChild(p); card.appendChild(small);
  wrap.appendChild(card);
  app.appendChild(wrap);
  console.error(err);
}

function parseHash(){
  const raw = window.location.hash || '#/';
  const clean = raw.startsWith('#') ? raw.slice(1) : raw;
  const parts = clean.split('?');
  return { raw, path: parts[0] || '/', query: new URLSearchParams(parts[1] || '') };
}

async function initData(){
  if(!App.state.routesIndex) App.state.routesIndex = await loadRoutesIndex();

  // Restaurar última ruta usada si existe
  if(!App.state.currentRoute){
    const lastId = lsGet('rt_last_route_id');
    if(lastId){
      const found = App.state.routesIndex.routes.find(r => r.id === lastId) || null;
      if(found) App.state.currentRoute = found;
    }
  }

  if(!App.state.currentRoute) App.state.currentRoute = App.state.routesIndex.routes[0] || null;

  if(App.state.currentRoute && !App.state.currentStops){
    App.state.currentStops = await loadRouteStops(App.state.currentRoute);
  }
}

async function ensureRouteLoaded(routeId){
  await initData();
  const idx = App.state.routesIndex;
  const target = idx.routes.find(r => r.id === routeId) || idx.routes[0];
  if(!target) return;

  // Guardar última ruta usada
  lsSet('rt_last_route_id', target.id);

  if(!App.state.currentRoute || App.state.currentRoute.id !== target.id){
    App.state.currentRoute = target;
    App.state.currentStops = await loadRouteStops(target);
  }else if(!App.state.currentStops){
    App.state.currentStops = await loadRouteStops(target);
  }
}

function bindGlobal(){
  const topBtn = qs('#btnGoTop');
  if(topBtn){
    topBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      window.scrollTo({top:0, behavior:'smooth'});
    });
  }
}

async function route(){
  try{
  const { path, query, raw } = parseHash();
  setWelcomeMode(path === '/' || path === '/welcome');
  setActiveNav(raw.startsWith('#/mapa') ? '#/mapa'
    : raw.startsWith('#/dashboard') ? '#/dashboard'
    : raw.startsWith('#/logros') ? '#/logros'
    : '#/ruta'
  );

  const app = qs('#app');
  if(!app) return;

  const prof = ensureProfile(false);
  if(!prof && (path !== '/' && path !== '/welcome' && path !== '/perfil')){
    window.location.hash = '#/welcome';
    return;
  }

  if(path === '/' || path === '/welcome'){ renderWelcome(app); focusApp(); return; }
  if(path === '/perfil'){ renderProfile(app); focusApp(); return; }

  await initData();

  if(path === '/seleccionar'){ renderSelectRoute(app, App.state.routesIndex, App.state.currentRoute); focusApp(); return; }

  if(path === '/ruta'){
    requestGeolocationPermission();
    const routeId = query.get('r') || lsGet('rt_last_route_id') || (App.state.currentRoute ? App.state.currentRoute.id : null);
    if(routeId) await ensureRouteLoaded(routeId);
    renderActiveRoute(app, App.state.currentRoute, App.state.currentStops);
    focusApp(); return;
  }

  if(path === '/mapa'){
    requestGeolocationPermission();
    const routeId = query.get('r') || lsGet('rt_last_route_id') || (App.state.currentRoute ? App.state.currentRoute.id : null);
    if(routeId) await ensureRouteLoaded(routeId);
    renderMapView(app, App.state.currentRoute, App.state.currentStops);
    focusApp(); return;
  }

  if(path === '/parada'){
    requestGeolocationPermission();
    const routeId = query.get('r') || lsGet('rt_last_route_id') || (App.state.currentRoute ? App.state.currentRoute.id : null);
    const stopId = query.get('s') || '';
    if(routeId) await ensureRouteLoaded(routeId);
    renderStopDetails(app, App.state.currentRoute, App.state.currentStops, stopId);
    focusApp(); return;
  }

  if(path === '/favoritos'){
    setActiveTab('favoritos');
    await initData();
    const routeId = query.get('r') || lsGet('rt_last_route_id') || (App.state.currentRoute ? App.state.currentRoute.id : null);
    if(routeId) await ensureRouteLoaded(routeId);
    renderFavoritesView(app, App.state.routesIndex, App.state.currentRoute, App.state.currentStops);
    focusApp(); 
    return;
  }

  if(path === '/mi-perfil'){
    await initData();
    renderUserProfile(app, App.state.routesIndex);
    focusApp(); return;
  }

  if(path === '/dashboard'){ renderDashboard(app, App.state.routesIndex); focusApp(); return; }

  if(path === '/logros'){
    app.replaceChildren();
    const wrap = document.createElement('div'); wrap.className = 'container';
    const card = document.createElement('section'); card.className = 'card pad';
    const h = document.createElement('h1'); h.className = 'h1'; h.textContent = 'Mis medallas y logros';
    const p = document.createElement('p'); p.className = 'p';
    p.textContent = 'Tus medallas se desbloquean al completar paradas, rutas y valoraciones.';
    const small = document.createElement('div'); small.className = 'small';
    small.textContent = 'Completa una ruta y valora al menos 5 paradas para desbloquear nuevas medallas.';
    card.appendChild(h); card.appendChild(p); card.appendChild(small);
    wrap.appendChild(card); app.appendChild(wrap);
    focusApp(); return;
  }

  window.location.hash = '#/ruta';
  }catch(e){
    renderFatalError(e);
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async ()=>{
  const bf = document.getElementById('boot-fallback');
  if(bf) bf.remove();

  requestGeolocationPermission();
  bindGlobal();
  if(!window.location.hash) window.location.hash = '#/welcome';
  await route();
});
