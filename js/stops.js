const DISTANCE_CHECK_METERS = 60;

function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}

function safeJSONParse(str){
  try { return JSON.parse(str); } catch { return null; }
}

function getProgressKey(routeId){ return 'rt_progress_' + routeId; }

function getProgress(routeId){
  const raw = localStorage.getItem(getProgressKey(routeId));
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  const blank = { startedAt: null, finishedAt: null, completedStopIds: [], stopRatings: {}, routeRating: 0 };
  localStorage.setItem(getProgressKey(routeId), JSON.stringify(blank));
  return blank;
}

function saveProgress(routeId, prog){
  localStorage.setItem(getProgressKey(routeId), JSON.stringify(prog));
}

function resetProgress(routeId){
  try{ localStorage.removeItem(getProgressKey(routeId)); }catch(_e){}
}
function getNextStop(data, prog){
  return nextStop(data, prog);
}
function renderProgressUI(route, data, prog){
  const total = (data && Array.isArray(data.stops)) ? data.stops.length : 0;
  const done = (prog && Array.isArray(prog.completedStopIds)) ? prog.completedStopIds.length : 0;
  return renderProgressBlock(total, done);
}

function getFavoritesKey(routeId){ return 'rt_favorites_' + routeId; }
function getFavorites(routeId){
  const raw = localStorage.getItem(getFavoritesKey(routeId));
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  const blank = {};
  localStorage.setItem(getFavoritesKey(routeId), JSON.stringify(blank));
  return blank;
}
function saveFavorites(routeId, favs){
  localStorage.setItem(getFavoritesKey(routeId), JSON.stringify(favs));
}


function sortStops(stops){ return [...stops].sort((a,b)=> (a.order||0) - (b.order||0)); }

export async function loadRouteStops(route){
  const res = await fetch(new URL(route.file, document.baseURI).toString(), { cache: 'no-store' });
  if(!res.ok) throw new Error('No se pudo cargar ' + route.file);
  const data = await res.json();
  if(!data || !Array.isArray(data.stops)) throw new Error('Fichero de paradas inválido: ' + route.file);
  data.stops = sortStops(data.stops);
  return data;
}

/* ===== Google Maps loader ===== */
function getMapsKey(){
  const meta = document.querySelector('meta[name="rt-gmaps-key"]');
  return meta ? String(meta.getAttribute('content') || '').trim() : '';
}

export function loadGoogleMaps(){
  return new Promise((resolve, reject)=>{
    if(window.google && window.google.maps) return resolve();
    const key = getMapsKey();
    if(!key) return reject(new Error('Falta la API_KEY de Google Maps'));

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&libraries=geometry';
    script.onload = ()=> resolve();
    script.onerror = ()=> reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  });
}

function metersBetween(a, b){
  if(!(window.google && window.google.maps && window.google.maps.geometry)) return null;
  const p1 = new window.google.maps.LatLng(a.lat, a.lng);
  const p2 = new window.google.maps.LatLng(b.lat, b.lng);
  return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
}

function nextStop(routeId, stops, prog){
  for(const s of stops){
    if(!prog.completedStopIds.includes(s.id)) return s;
  }
  return null;
}

function buildStars(value, onChange){
  const wrap = makeEl('div','stars','');
  for(let i=1; i<=5; i++){
    const b = makeEl('button','star-btn', i <= value ? '★' : '☆');
    b.type = 'button';
    b.setAttribute('aria-label', 'Valorar ' + i + ' estrellas');
    b.setAttribute('aria-pressed', String(i <= value));
    b.addEventListener('click', (e)=>{ e.preventDefault(); onChange(i); });
    wrap.appendChild(b);
  }
  return wrap;
}

function renderProgressBlock(total, done){
  const wrap = makeEl('div','progress-wrap','');
  const top = makeEl('div','row spread','');
  const left = makeEl('div','badge', done + '/' + total + ' paradas');
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  const right = makeEl('div','small', pct + '% completado');
  top.appendChild(left); top.appendChild(right);

  const bar = makeEl('div','progressbar','');
  const fill = document.createElement('div');
  fill.style.width = pct + '%';
  bar.appendChild(fill);

  wrap.appendChild(top);
  wrap.appendChild(bar);
  return wrap;
}


function updateProgressFromDOM(done){
  const total = Number(document.documentElement.dataset.rtTotalStops || '0') || 0;
  const badge = document.querySelector('.route-summary .progress-wrap .badge');
  const small = document.querySelector('.route-summary .progress-wrap .small');
  const fill = document.querySelector('.route-summary .progressbar > div');
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  if(badge) badge.textContent = done + '/' + total + ' paradas';
  if(small) small.textContent = pct + '% completado';
  if(fill) fill.style.width = pct + '%';
}


function stopItem(routeId, stop, prog, favs){
  prog.completedStopIds = Array.isArray(prog.completedStopIds) ? prog.completedStopIds : [];
  const done = prog.completedStopIds.includes(stop.id);

  const item = makeEl('div','item' + (done ? ' is-done' : ''),'');

  const img = document.createElement('img');
  img.alt = 'Foto ' + (stop.name || 'parada');
  img.src = stop.photo || 'assets/images/ui/placeholder_stop.jpg';
  img.style.width = '6.2rem';
  img.style.height = '6.2rem';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '1.8rem';
  img.style.border = '1px solid rgba(255,255,255,.08)';

  const meta = makeEl('div','meta','');
  meta.appendChild(makeEl('div','title', (stop.order || '') + '. ' + (stop.name || 'Parada')));
  meta.appendChild(makeEl('div','sub', stop.tapa ? ('Tapa: ' + stop.tapa) : (stop.address || '')));

  const right = makeEl('div','right','');

  // Toggle hecha/pendiente (sin etiqueta textual)
  const toggleBtn = makeEl('button','fav-btn stop-toggle', done ? '✓' : '○');
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-label', done ? 'Marcar como pendiente' : 'Marcar como hecha');
  toggleBtn.setAttribute('aria-pressed', String(done));
  toggleBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const isDone = prog.completedStopIds.includes(stop.id);
    if(isDone) prog.completedStopIds = prog.completedStopIds.filter(x => x !== stop.id);
    else prog.completedStopIds.push(stop.id);

    saveProgress(routeId, prog);

    const nowDone = !isDone;
    item.classList.toggle('is-done', nowDone);
    toggleBtn.textContent = nowDone ? '✓' : '○';
    toggleBtn.setAttribute('aria-pressed', String(nowDone));
    toggleBtn.setAttribute('aria-label', nowDone ? 'Marcar como pendiente' : 'Marcar como hecha');
    updateProgressFromDOM(prog.completedStopIds.length);

    if(window.RT_TOAST) window.RT_TOAST(nowDone ? 'Parada marcada como hecha' : 'Parada marcada como pendiente');
  });
  right.appendChild(toggleBtn);

  // Favorito
  const isFav = !!(favs && favs[stop.id]);
  const favBtn = makeEl('button','fav-btn', isFav ? '♥' : '♡');
  favBtn.type = 'button';
  favBtn.setAttribute('aria-label', isFav ? 'Quitar de favoritos' : 'Marcar como favorito');
  favBtn.setAttribute('aria-pressed', String(isFav));
  favBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const now = !(favs && favs[stop.id]);
    if(!favs) favs = {};
    if(now) favs[stop.id] = true;
    else delete favs[stop.id];
    saveFavorites(routeId, favs);
    favBtn.textContent = now ? '♥' : '♡';
    favBtn.setAttribute('aria-pressed', String(now));
    favBtn.setAttribute('aria-label', now ? 'Quitar de favoritos' : 'Marcar como favorito');
    if(window.RT_TOAST) window.RT_TOAST(now ? 'Añadido a favoritos' : 'Quitado de favoritos');
  });
  right.appendChild(favBtn);

  // Ver detalle
  const view = makeEl('a','btn btn-ghost','Ver');
  view.href = '#/parada?r=' + encodeURIComponent(routeId) + '&s=' + encodeURIComponent(stop.id);
  right.appendChild(view);

  item.appendChild(img);
  item.appendChild(meta);
  item.appendChild(right);

  return item;
}



async function initRouteMap(el, data, routeId){
  if(!el) return;
  await loadGoogleMaps();

  const stops = (data && data.stops) ? data.stops : [];
  const total = stops.length;

  const startCenter = (data && data.meta && data.meta.start)
    ? { lat: data.meta.start.lat, lng: data.meta.start.lng }
    : (stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: 37.17855, lng: -3.6036 });

  const map = new window.google.maps.Map(el, {
    center: startCenter,
    zoom: 15,
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true
  });

  // Exponer para el botón maximizar (resize)
  el.__rt_map = map;

  const bounds = new window.google.maps.LatLngBounds();

  // InfoWindow único
  const info = new window.google.maps.InfoWindow();

  function openStopPopup(stop){
    if(!stop) return;
    const wrap = document.createElement('div');
    wrap.style.maxWidth = '240px';

    const t = document.createElement('div');
    t.style.fontWeight = '900';
    t.style.marginBottom = '6px';
    t.textContent = stop.name || 'Parada';
    wrap.appendChild(t);

    if(stop.tapa){
      const s = document.createElement('div');
      s.style.fontSize = '12px';
      s.textContent = 'Tapa: ' + stop.tapa;
      wrap.appendChild(s);
    }
    if(stop.address){
      const a = document.createElement('div');
      a.style.fontSize = '12px';
      a.style.opacity = '.8';
      a.textContent = stop.address;
      wrap.appendChild(a);
    }
    info.setContent(wrap);
    info.open({ map, anchor: stop.__marker });
  }

  // Marcadores: inicio/fin + paradas
  if(data && data.meta && data.meta.start){
    const p = { lat: data.meta.start.lat, lng: data.meta.start.lng };
    new window.google.maps.Marker({ position: p, map, label: { text: '🏁', fontSize: '18px' } });
    bounds.extend(p);
  }
  if(data && data.meta && data.meta.end){
    const p = { lat: data.meta.end.lat, lng: data.meta.end.lng };
    new window.google.maps.Marker({ position: p, map, label: { text: '🏁', fontSize: '18px' } });
    bounds.extend(p);
  }

  stops.forEach((s)=>{
    const p = { lat: s.lat, lng: s.lng };
    const mk = new window.google.maps.Marker({ position: p, map, label: { text: '📍', fontSize: '16px' } });
    s.__marker = mk;
    mk.addListener('click', ()=> openStopPopup(s));
    bounds.extend(p);
  });

  if(!bounds.isEmpty()) map.fitBounds(bounds, 64);

  // Mi posición (tracking)
  let userMarker = null;
  let lastUserPos = null;

  // Directions (a pie) + polyline punteada
  const dirSvc = new window.google.maps.DirectionsService();
  let dirRenderer = new window.google.maps.DirectionsRenderer({
    suppressMarkers: true,
    preserveViewport: true,
    polylineOptions: {
      strokeOpacity: 0,
      icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
        offset: '0',
        repeat: '14px'
      }]
    }
  });
  dirRenderer.setMap(map);

  function getProg(){
    return getProgress(routeId);
  }
  function getNextStopFromProg(){
    const prog = getProg();
    return nextStop(data, prog);
  }

  let lastRoutedStopId = null;
  let routingEnabled = false;
  let routeThrottle = 0;

  async function routeToStop(stop){
    if(!stop || !lastUserPos) return;
    lastRoutedStopId = stop.id;

    dirSvc.route({
      origin: lastUserPos,
      destination: { lat: stop.lat, lng: stop.lng },
      travelMode: window.google.maps.TravelMode.WALKING
    }, (result, status)=>{
      if(status === 'OK' && result){
        dirRenderer.setDirections(result);
        openStopPopup(stop);
      }
    });
  }

  function maybeAutoRoute(){
    if(!routingEnabled) return;
    const stop = getNextStopFromProg();
    if(!stop) return;
    // si cambia la parada objetivo, recalcula siempre
    const now = Date.now();
    if(stop.id !== lastRoutedStopId || (now - routeThrottle) > 2500){
      routeThrottle = now;
      routeToStop(stop);
    }
  }

  if('geolocation' in navigator){
    const watchId = navigator.geolocation.watchPosition((pos)=>{
      lastUserPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if(!userMarker){
        userMarker = new window.google.maps.Marker({
          position: lastUserPos,
          map,
          label: { text: '👤', fontSize: '16px' }
        });
      }else{
        userMarker.setPosition(lastUserPos);
      }
      maybeAutoRoute();
    }, ()=>{}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 });

    // Cleanup si navegas y el nodo desaparece
    const obs = new MutationObserver(()=>{
      if(!document.body.contains(el)){
        try{ navigator.geolocation.clearWatch(watchId); }catch(_e){}
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList:true, subtree:true });
  }

  // Eventos desde la UI (Comenzar / Siguiente)
  // El renderActiveRoute despacha estos eventos.
  function onStart(){
    routingEnabled = true;
    lastRoutedStopId = null;
    maybeAutoRoute();
  }
  function onNext(){
    routingEnabled = true;
    lastRoutedStopId = null;
    maybeAutoRoute();
  }
  window.addEventListener('rt:startRoute', onStart);
  window.addEventListener('rt:nextStop', onNext);

  // Cleanup listeners si se destruye el mapa
  const obs2 = new MutationObserver(()=>{
    if(!document.body.contains(el)){
      window.removeEventListener('rt:startRoute', onStart);
      window.removeEventListener('rt:nextStop', onNext);
      obs2.disconnect();
    }
  });
  obs2.observe(document.body, { childList:true, subtree:true });
}


export function renderActiveRoute(root, route, data){
  root.replaceChildren();
  const container = makeEl('div','container','');

  if(!route || !data){
    const card = makeEl('section','card pad','');
    card.appendChild(makeEl('h1','h1','Ruta'));
    card.appendChild(makeEl('p','p','No hay ruta cargada.'));
    container.appendChild(card);
    root.appendChild(container);
    return;
  }

  const prog = getProgress(route.id);
  document.documentElement.dataset.rtTotalStops = String((data && Array.isArray(data.stops)) ? data.stops.length : 0);
  const favs = getFavorites(route.id);

  const stack = makeEl('div','route-stack','');

  // ===== TABLERO 1: Resumen (título + leyenda + progreso + botones) =====
  const summary = makeEl('section','card pad route-summary','');

  const head = makeEl('div','route-head','');
  const title = makeEl('h1','route-title', route.title || 'Ruta');
  head.appendChild(title);

  const legend = makeEl('div','legend-right','');
  legend.appendChild(makeEl('span','legend-item','🏁 Inicio/Fin'));
  legend.appendChild(makeEl('span','legend-item','📍 Parada'));
  legend.appendChild(makeEl('span','legend-item','👤 Yo'));
  head.appendChild(legend);

  summary.appendChild(head);

  // Progreso
  const progressUI = renderProgressUI(route, data, prog);
  summary.appendChild(progressUI);

  // Botones principales debajo de la línea de progreso
  const actions = makeEl('div','actions-row','');

  const btnStart = makeEl('button','btn btn-primary','Comenzar');
  btnStart.type = 'button';
  btnStart.addEventListener('click', (e)=>{
    e.preventDefault();
    if(!prog.startedAt){
      prog.startedAt = Date.now();
      saveProgress(route.id, prog);
      if(window.RT_TOAST) window.RT_TOAST('Ruta iniciada.');
    }
    window.dispatchEvent(new Event('rt:startRoute'));
    renderActiveRoute(root, route, data);
  });

  const btnNext = makeEl('button','btn','Siguiente');
  btnNext.type = 'button';
  btnNext.addEventListener('click', (e)=>{
    e.preventDefault();
    const nextStop = getNextStop(data, prog);
    if(!nextStop){
      if(window.RT_TOAST) window.RT_TOAST('No hay más paradas pendientes.');
      return;
    }
    window.dispatchEvent(new Event('rt:nextStop'));
    window.location.hash = '#/parada?r=' + encodeURIComponent(route.id) + '&s=' + encodeURIComponent(nextStop.id);
  });

  const btnReset = makeEl('button','btn btn-danger','Reiniciar');
  btnReset.type = 'button';
  btnReset.addEventListener('click', (e)=>{
    e.preventDefault();
    resetProgress(route.id);
    if(window.RT_TOAST) window.RT_TOAST('Progreso reiniciado.');
    renderActiveRoute(root, route, data);
  });

  actions.appendChild(btnStart);
  actions.appendChild(btnNext);
  actions.appendChild(btnReset);
  summary.appendChild(actions);

  // ===== TABLERO 2: Mapa y seguimiento =====
  const mapCard = makeEl('section','card pad route-map-card','');
  const mapTitleRow = makeEl('div','row spread','');
  mapTitleRow.appendChild(makeEl('h2','h2','Mapa y seguimiento'));
  mapTitleRow.appendChild(makeEl('div','small','Activa la ubicación para ver tu posición.'));
  const btnMax = makeEl('button','btn btn-ghost','Maximizar');
  btnMax.type = 'button';
  btnMax.addEventListener('click',(e)=>{
    e.preventDefault();
    mapCard.classList.toggle('is-max');
    document.body.classList.toggle('is-map-max', mapCard.classList.contains('is-max'));
    btnMax.textContent = mapCard.classList.contains('is-max') ? 'Cerrar' : 'Maximizar';
    setTimeout(()=>{
      const m = mapBox.__rt_map;
      if(m){ window.google.maps.event.trigger(m,'resize'); }
    }, 220);
  });
  mapTitleRow.appendChild(btnMax);
  mapCard.appendChild(mapTitleRow);

  const mapBox = makeEl('div','mapbox','');
  mapBox.id = 'routeMap';
  mapCard.appendChild(mapBox);

  initRouteMap(mapBox, data, route.id);

  // ===== TABLERO 3: Paradas =====
  const listCard = makeEl('section','card pad','');
  listCard.appendChild(makeEl('h2','h2','Paradas de la ruta'));

  const list = makeEl('div','list','');
  (data.stops || []).forEach(s => {
    list.appendChild(stopItem(route.id, s, prog, favs));
  });
  listCard.appendChild(list);

  stack.appendChild(summary);
  stack.appendChild(mapCard);
  stack.appendChild(listCard);

  container.appendChild(stack);
  root.appendChild(container);
}

async function initMiniMap(elId, data){
  const el = document.getElementById(elId);
  if(!el) return;
  await loadGoogleMaps();

  const center = (data.meta && data.meta.start)
    ? { lat: data.meta.start.lat, lng: data.meta.start.lng }
    : (data.stops && data.stops[0]) ? { lat: data.stops[0].lat, lng: data.stops[0].lng } : { lat: 37.17855, lng: -3.6036 };

  const map = new window.google.maps.Map(el, {
    center,
    zoom: 15,
    disableDefaultUI: true,
    clickableIcons: false,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#0f1724" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#0b0f14" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#9aa7b6" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#1b2a3f" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#09131f" }] }
    ]
  });

  if(data.meta && data.meta.start){
    new window.google.maps.Marker({
      map,
      position: { lat: data.meta.start.lat, lng: data.meta.start.lng },
      title: 'Inicio: ' + data.meta.start.name,
      label: { text: '🏁', fontSize: '18px' }
    });
  }
  if(data.meta && data.meta.end){
    new window.google.maps.Marker({
      map,
      position: { lat: data.meta.end.lat, lng: data.meta.end.lng },
      title: 'Fin: ' + data.meta.end.name,
      label: { text: '🏴', fontSize: '18px' }
    });
  }
}

export function renderStopDetails(root, route, data, stopId){
  root.replaceChildren();
  const container = makeEl('div','container','');

  if(!route || !data){
    const card = makeEl('section','card pad','');
    card.appendChild(makeEl('h1','h1','Detalle de parada'));
    card.appendChild(makeEl('p','p','No hay datos de ruta cargados.'));
    container.appendChild(card);
    root.appendChild(container);
    return;
  }

  const prog = getProgress(route.id);
  const favs = getFavorites(route.id);

  const stops = (data.stops || []);
  let stop = stops.find(s => s.id === stopId) || null;
  if(!stop && stops.length) stop = stops[0];
  if(!stop){
    const card = makeEl('section','card pad','');
    card.appendChild(makeEl('h1','h1','Detalle de parada'));
    card.appendChild(makeEl('p','p','No hay paradas en esta ruta.'));
    container.appendChild(card);
    root.appendChild(container);
    return;
  }

  const isDone = Array.isArray(prog.completedStopIds) && prog.completedStopIds.includes(stop.id);
  const isFav = !!(favs && favs[stop.id]);
  const currentRating = Number((prog.stopRatings && prog.stopRatings[stop.id]) || 0);

  const card = makeEl('section','card pad','');

  const topRow = makeEl('div','row spread','');
  const back = makeEl('a','btn btn-ghost','← Ruta');
  back.href = '#/ruta?r=' + encodeURIComponent(route.id);
  const goMap = makeEl('a','btn','Ver en mapa');
  goMap.href = '#/mapa?r=' + encodeURIComponent(route.id);
  topRow.appendChild(back);
  topRow.appendChild(goMap);

  const h1 = makeEl('h1','h1', stop.name || 'Parada');
  const sub = makeEl('p','p', stop.address || '');

  const photo = document.createElement('img');
  photo.alt = 'Foto de la parada';
  photo.className = 'stop-photo';
  photo.src = stop.photo || 'assets/images/ui/placeholder_stop.jpg';

  const info = makeEl('div','small','');
  info.textContent = stop.tapa ? ('Tapa típica: ' + stop.tapa) : 'Tapa típica: (sin especificar)';

  const notes = makeEl('p','p', stop.notes || '');

  // Acciones: hecho + favorito
  const actions = makeEl('div','row','');
  const doneBtn = makeEl('button','btn', isDone ? '✓ Hecha' : '○ Marcar hecha');
  doneBtn.type = 'button';
  doneBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    const nowDone = !(prog.completedStopIds || []).includes(stop.id);
    prog.completedStopIds = Array.isArray(prog.completedStopIds) ? prog.completedStopIds : [];
    if(nowDone) prog.completedStopIds.push(stop.id);
    else prog.completedStopIds = prog.completedStopIds.filter(x => x !== stop.id);
    saveProgress(route.id, prog);
    if(window.RT_TOAST) window.RT_TOAST(nowDone ? 'Parada marcada como hecha' : 'Parada marcada como pendiente');
    renderStopDetails(root, route, data, stop.id);
  });

  const favBtn = makeEl('button','btn', isFav ? '♥ Favorito' : '♡ Añadir a favoritos');
  favBtn.type = 'button';
  favBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    const now = !(favs && favs[stop.id]);
    if(!favs) {}
    if(now) favs[stop.id] = true;
    else delete favs[stop.id];
    saveFavorites(route.id, favs);
    if(window.RT_TOAST) window.RT_TOAST(now ? 'Añadido a favoritos' : 'Quitado de favoritos');
    renderStopDetails(root, route, data, stop.id);
  });

  actions.appendChild(doneBtn);
  actions.appendChild(favBtn);

  // Rating: 5 estrellas
  const ratingWrap = makeEl('div','rating-wrap','');
  const ratingTitle = makeEl('div','label','Valora esta parada');
  const stars = makeEl('div','stars','');
  const hint = makeEl('div','small','Toca una estrella para valorar (1-5).');

  function setRating(val){
    const v = Number(val||0);
    prog.stopRatings = prog.stopRatings && typeof prog.stopRatings === 'object' ? prog.stopRatings : {};
    if(v <= 0) delete prog.stopRatings[stop.id];
    else prog.stopRatings[stop.id] = v;
    saveProgress(route.id, prog);
    if(window.RT_TOAST) window.RT_TOAST('Valoración guardada: ' + v + '★');
    // refresca
    renderStopDetails(root, route, data, stop.id);
  }

  for(let i=1;i<=5;i++){
    const b = makeEl('button','star-btn', i <= currentRating ? '★' : '☆');
    b.type = 'button';
    b.setAttribute('aria-label', 'Puntuar ' + i + ' de 5');
    b.setAttribute('aria-pressed', String(i <= currentRating));
    b.addEventListener('click',(e)=>{
      e.preventDefault();
      setRating(i);
    });
    stars.appendChild(b);
  }

  ratingWrap.appendChild(ratingTitle);
  ratingWrap.appendChild(stars);
  ratingWrap.appendChild(hint);

  // Link web si existe
  let webRow = null;
  if(stop.web){
    webRow = makeEl('div','small','');
    const a = document.createElement('a');
    a.href = stop.web;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Abrir web';
    webRow.appendChild(a);
  }

  card.appendChild(topRow);
  card.appendChild(h1);
  card.appendChild(sub);
  card.appendChild(photo);
  card.appendChild(info);
  if(stop.notes) card.appendChild(notes);
  card.appendChild(actions);
  card.appendChild(makeEl('hr','hr',''));
  card.appendChild(ratingWrap);
  if(webRow){ card.appendChild(makeEl('hr','hr','')); card.appendChild(webRow); }

  container.appendChild(card);
  root.appendChild(container);
}

export function renderMapView(root, route, data){
  root.replaceChildren();
  const container = makeEl('div','container','');
  const card = makeEl('section','card pad','');

  card.appendChild(makeEl('h1','h1','Mapa detallado de la ruta'));
  card.appendChild(makeEl('p','p','Ruta a pie con tu posición en tiempo real. La línea se muestra punteada.'));

  const infoRow = makeEl('div','row spread','');
  const infoLeft = makeEl('div','badge','Listo');
  const infoRight = makeEl('div','small','');
  infoRow.appendChild(infoLeft); infoRow.appendChild(infoRight);

  const map = makeEl('div','mapbox',''); map.id = 'mapFull';

  const actions = makeEl('div','row','');
  const back = makeEl('a','btn btn-ghost','Volver');
  back.href = '#/ruta?r=' + encodeURIComponent(route.id);
  const btnCenter = makeEl('button','btn','Centrar mi posición');
  btnCenter.type = 'button';
  const btnNext = makeEl('button','btn btn-primary','Ir a siguiente parada');
  btnNext.type = 'button';
  actions.appendChild(back); actions.appendChild(btnCenter); actions.appendChild(btnNext);

  card.appendChild(infoRow);
  card.appendChild(map);
  card.appendChild(document.createElement('hr')).className = 'hr';
  card.appendChild(actions);
  container.appendChild(card);
  root.appendChild(container);

  initFullMap(route, data, infoLeft, infoRight, btnCenter).catch((err)=>{
    infoLeft.textContent = 'Mapa no disponible';
    infoRight.textContent = (err && err.message) ? err.message : 'Error';
    if(window.RT_TOAST) window.RT_TOAST('No se pudo cargar Google Maps.');
  });

  btnNext.addEventListener('click', (e)=>{
    e.preventDefault();
    const prog = getProgress(route.id);
  document.documentElement.dataset.rtTotalStops = String((data && Array.isArray(data.stops)) ? data.stops.length : 0);
  const favs = getFavorites(route.id);
    const stops = data.stops || [];
    const next = nextStop(route.id, stops, prog);
    if(!next){ if(window.RT_TOAST) window.RT_TOAST('¡Ruta completada!'); return; }
    window.location.hash = '#/parada?r=' + encodeURIComponent(route.id) + '&s=' + encodeURIComponent(next.id);
  });
}

async function initFullMap(route, data, infoLeft, infoRight, btnCenter){
  await loadGoogleMaps();

  const el = document.getElementById('mapFull');
  if(!el) return;

  const stops = data.stops || [];
  const prog = getProgress(route.id);
  document.documentElement.dataset.rtTotalStops = String((data && Array.isArray(data.stops)) ? data.stops.length : 0);
  const favs = getFavorites(route.id);

  const start = (data.meta && data.meta.start) ? { lat: data.meta.start.lat, lng: data.meta.start.lng }
                : stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: 37.17855, lng: -3.6036 };

  const map = new window.google.maps.Map(el, {
    center: start,
    zoom: 15,
    clickableIcons: false,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#0f1724" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#0b0f14" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#9aa7b6" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#1b2a3f" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#09131f" }] }
    ]
  });

  stops.forEach(s => {
    const done = prog.completedStopIds.includes(s.id);
    const m = new window.google.maps.Marker({
      map,
      position: { lat: s.lat, lng: s.lng },
      title: s.name,
      label: { text: done ? '✓' : String(s.order || ''), fontSize: '12px' }
    });
    m.addListener('click', ()=>{
      window.location.hash = '#/parada?r=' + encodeURIComponent(route.id) + '&s=' + encodeURIComponent(s.id);
    });
  });

  if(data.meta && data.meta.start){
    new window.google.maps.Marker({
      map,
      position: { lat: data.meta.start.lat, lng: data.meta.start.lng },
      title: 'Inicio: ' + data.meta.start.name,
      label: { text: '🏁', fontSize: '18px' }
    });
  }
  if(data.meta && data.meta.end){
    new window.google.maps.Marker({
      map,
      position: { lat: data.meta.end.lat, lng: data.meta.end.lng },
      title: 'Fin: ' + data.meta.end.name,
      label: { text: '🏴', fontSize: '18px' }
    });
  }

  const ds = new window.google.maps.DirectionsService();
  const dr = new window.google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    preserveViewport: false,
    polylineOptions: {
      strokeOpacity: 0,
      icons: [{
        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 },
        offset: "0",
        repeat: "12px"
      }]
    }
  });

  const waypoints = stops.slice(1, Math.min(stops.length-1, 20)).map(s => ({
    location: { lat: s.lat, lng: s.lng },
    stopover: true
  }));

  const origin = stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : start;
  const destination = stops[stops.length-1] ? { lat: stops[stops.length-1].lat, lng: stops[stops.length-1].lng } : start;

  ds.route({
    origin,
    destination,
    waypoints,
    optimizeWaypoints: false,
    travelMode: window.google.maps.TravelMode.WALKING
  }, (result, status)=>{
    if(status === 'OK' && result){
      dr.setDirections(result);
      infoLeft.textContent = 'Ruta cargada';
      const leg0 = result.routes[0] && result.routes[0].legs && result.routes[0].legs[0] ? result.routes[0].legs[0] : null;
      if(leg0 && leg0.distance && leg0.duration){
        infoRight.textContent = 'Distancia aprox.: ' + leg0.distance.text + ' · ' + leg0.duration.text;
      }else{
        infoRight.textContent = '';
      }
    }else{
      infoLeft.textContent = 'Ruta no disponible';
      infoRight.textContent = String(status || '');
    }
  });

  let userMarker = null;
  let lastPos = null;

  function setUser(pos){
    lastPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if(!userMarker){
      userMarker = new window.google.maps.Marker({
        map,
        position: lastPos,
        title: 'Tu posición',
        label: { text: '●', fontSize: '16px' }
      });
    }else{
      userMarker.setPosition(lastPos);
    }

    const n = nextStop(route.id, stops, getProgress(route.id));
    if(n){
      const m = metersBetween(lastPos, { lat: n.lat, lng: n.lng });
      if(typeof m === 'number'){
        const rounded = Math.round(m);
        infoLeft.textContent = 'Siguiente: ' + n.name;
        infoRight.textContent = 'A ' + rounded + ' m';
        if(rounded <= DISTANCE_CHECK_METERS && window.RT_TOAST){
          window.RT_TOAST('Estás cerca de "' + n.name + '" — puedes hacer check‑in.');
        }
      }
    }
  }

  btnCenter.addEventListener('click', (e)=>{
    e.preventDefault();
    if(lastPos) map.panTo(lastPos);
    else if(window.RT_TOAST) window.RT_TOAST('Aún no hay posición del usuario.');
  });

  if(navigator.geolocation){
    navigator.geolocation.watchPosition(setUser, (err)=>{
      infoLeft.textContent = 'Geolocalización desactivada';
      infoRight.textContent = (err && err.message) ? err.message : '';
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });
  }else{
    infoLeft.textContent = 'Sin geolocalización';
    infoRight.textContent = 'Tu navegador no la soporta.';
  }
}
