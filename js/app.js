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
    app.replaceChildren();
    const wrap = document.createElement('div'); wrap.className = 'container';
    const card = document.createElement('section'); card.className = 'card pad';
    const h = document.createElement('h1'); h.className = 'h1'; h.textContent = 'Favoritos';
    const p = document.createElement('p'); p.className = 'p';
    p.textContent = 'Aquí verás tus bares favoritos (guardado en este dispositivo).';
    card.appendChild(h); card.appendChild(p);
    wrap.appendChild(card); app.appendChild(wrap);
    focusApp(); return;
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
