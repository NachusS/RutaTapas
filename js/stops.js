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
  const res = await fetch(route.file, { cache: 'no-store' });
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

function stopItem(routeId, stop, prog, favs){
  const item = makeEl('div','item','');

  const img = document.createElement('img');
  img.alt = 'Foto ' + stop.name;
  img.src = stop.photo || 'assets/images/ui/placeholder_stop.jpg';
  img.style.width = '6.2rem';
  img.style.height = '6.2rem';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '1.8rem';
  img.style.border = '1px solid rgba(255,255,255,.08)';

  const meta = makeEl('div','meta','');
  meta.appendChild(makeEl('div','title', (stop.order || '') + '. ' + stop.name));
  meta.appendChild(makeEl('div','sub', stop.tapa ? ('Tapa: ' + stop.tapa) : (stop.address || '')));

  const right = makeEl('div','right','');
  const done = prog.completedStopIds.includes(stop.id);
  right.appendChild(makeEl('div','chip', done ? 'Hecha' : 'Pendiente'));

  
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
const btn = makeEl('a','btn btn-ghost','Ver');
  btn.href = '#/parada?r=' + encodeURIComponent(routeId) + '&s=' + encodeURIComponent(stop.id);
  btn.style.padding = '.8rem 1.0rem';
  btn.style.borderRadius = '1.2rem';
  right.appendChild(btn);

  item.appendChild(img);
  item.appendChild(meta);
  item.appendChild(right);
  return item;
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
  legend.appendChild(makeEl('span','legend-item','👤 Mi posición'));
  head.appendChild(legend);

  summary.appendChild(head);

  // Progreso
  const progressUI = renderProgressUI(route, data, prog);
  summary.appendChild(progressUI);

  // Botones principales debajo de la línea de progreso
  const actions = makeEl('div','actions-row','');

  const btnStart = makeEl('button','btn btn-primary','Comenzar ruta');
  btnStart.type = 'button';
  btnStart.addEventListener('click', (e)=>{
    e.preventDefault();
    if(!prog.startedAt){
      prog.startedAt = Date.now();
      saveProgress(route.id, prog);
      if(window.RT_TOAST) window.RT_TOAST('Ruta iniciada.');
    }
    renderActiveRoute(root, route, data);
  });

  const btnNext = makeEl('button','btn','Siguiente parada');
  btnNext.type = 'button';
  btnNext.addEventListener('click', (e)=>{
    e.preventDefault();
    const nextStop = getNextStop(data, prog);
    if(!nextStop){
      if(window.RT_TOAST) window.RT_TOAST('No hay más paradas pendientes.');
      return;
    }
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
  mapCard.appendChild(mapTitleRow);

  const mapBox = makeEl('div','mapbox','');
  mapBox.id = 'routeMap';
  mapCard.appendChild(mapBox);

  initRouteMap(mapBox, data, prog);

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
  const grid = makeEl('div','grid cols2','');

  const stops = data.stops || [];
  const stop = stops.find(s => s.id === stopId) || stops[0];
  const prog = getProgress(route.id);
  const favs = getFavorites(route.id);

  const left = makeEl('section','card pad','');
  left.appendChild(makeEl('h1','h1', stop ? stop.name : 'Parada'));
  left.appendChild(makeEl('p','p', stop && stop.tapa ? ('Tapa típica: ' + stop.tapa) : 'Detalle de la parada.'));

  const img = document.createElement('img');
  img.alt = 'Foto de ' + (stop ? stop.name : 'parada');
  img.src = (stop && stop.photo) ? stop.photo : 'assets/images/ui/placeholder_stop.jpg';
  img.style.borderRadius = '2.2rem';
  img.style.border = '1px solid rgba(255,255,255,.08)';
  left.appendChild(img);

  left.appendChild(makeEl('div','small', stop && stop.address ? stop.address : 'Dirección no disponible'));
  if(stop && stop.notes) left.appendChild(makeEl('div','small', stop.notes));

  const done = prog.completedStopIds.includes(stop.id);
  const doneChip = makeEl('div','badge', done ? 'Parada realizada' : 'Pendiente');
  doneChip.style.marginTop = '1.0rem';
  left.appendChild(doneChip);

  left.appendChild(document.createElement('hr')).className = 'hr';

  const actions = makeEl('div','row','');
  const back = makeEl('a','btn btn-ghost','Volver a la ruta');
  back.href = '#/ruta?r=' + encodeURIComponent(route.id);
  const goMap = makeEl('a','btn','Ver en mapa');
  goMap.href = '#/mapa?r=' + encodeURIComponent(route.id);
  const btnDone = makeEl('button','btn btn-primary', done ? 'Ya marcada' : 'Marcar como hecha');
  btnDone.type = 'button';
  btnDone.disabled = !!done;

  actions.appendChild(back); actions.appendChild(goMap); actions.appendChild(btnDone);
  left.appendChild(actions);

  const legend = makeEl('div','legend-right','');
  legend.appendChild(makeEl('span','legend-item','🏁 Inicio/Fin'));
  legend.appendChild(makeEl('span','legend-item','📍 Parada'));
  legend.appendChild(makeEl('span','legend-item','👤 Mi posición'));
  left.appendChild(legend);

  const right = makeEl('section','card pad','');
  right.appendChild(makeEl('h2','h2','Valorar esta parada'));
  const current = Number(prog.stopRatings[stop.id] || 0);

  const starsHost = makeEl('div','', '');
  function renderStars(val){
    starsHost.replaceChildren();
    starsHost.appendChild(buildStars(val, (n)=>{
      prog.stopRatings[stop.id] = n;
      saveProgress(route.id, prog);
      renderStars(n);
      if(window.RT_TOAST) window.RT_TOAST('Valoración guardada: ' + n + '★');
    }));
  }
  renderStars(current);

  right.appendChild(starsHost);
  right.appendChild(makeEl('div','small','Tu valoración se guarda en este dispositivo.'));
  right.appendChild(document.createElement('hr')).className = 'hr';
  right.appendChild(makeEl('div','small','Sugerencia: cuando estés cerca (<60 m), puedes hacer check‑in rápidamente.'));

  grid.appendChild(left); grid.appendChild(right);
  container.appendChild(grid);
  root.appendChild(container);

  btnDone.addEventListener('click', (e)=>{
    e.preventDefault();
    if(prog.completedStopIds.includes(stop.id)) return;
    prog.completedStopIds.push(stop.id);
    saveProgress(route.id, prog);
    btnDone.disabled = true;
    btnDone.textContent = 'Ya marcada';
    doneChip.textContent = 'Parada realizada';
    if(window.RT_TOAST) window.RT_TOAST('Parada marcada como realizada.');
  });
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
