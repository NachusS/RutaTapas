const LS_PROFILE = 'rt_profile';
function safeJSONParse(str){ try { return JSON.parse(str); } catch { return null; } }
export function ensureProfile(createIfMissing=true){
  const raw = localStorage.getItem(LS_PROFILE);
  const data = raw ? safeJSONParse(raw) : null;
  if(data && data.name) return data;
  if(!createIfMissing) return null;
  const blank = { name:'', avatar:'', photoDataUrl:'' };
  localStorage.setItem(LS_PROFILE, JSON.stringify(blank));
  return blank;
}
function saveProfile(p){ localStorage.setItem(LS_PROFILE, JSON.stringify(p)); }
function makeEl(tag, cls, text){ const el=document.createElement(tag); if(cls) el.className=cls; if(typeof text==='string') el.textContent=text; return el; }
function readFileAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||''));
    r.onerror=()=>reject(new Error('No se pudo leer la imagen'));
    r.readAsDataURL(file);
  });
}
export function renderWelcome(root){
  root.replaceChildren();
  const c=makeEl('div','container','');
  const g=makeEl('div','grid cols2','');
  const left=makeEl('section','card pad','');
  left.appendChild(makeEl('h1','h1','Bienvenido a RutaTapas v1.0'));
  left.appendChild(makeEl('p','p','Crea tu perfil rápido y empieza una ruta de tapas. Todo queda guardado en tu dispositivo.'));
  const prof=ensureProfile(false);
  const row=makeEl('div','row','');
  const start=makeEl('a','btn btn-primary', (prof&&prof.name)?'Continuar':'Crear perfil');
  start.href=(prof&&prof.name)?'#/ruta':'#/perfil';
  const sel=makeEl('a','btn','Seleccionar ruta'); sel.href='#/seleccionar';
  row.appendChild(start); row.appendChild(sel);
  left.appendChild(row);
  const right=makeEl('section','card pad','');
  right.appendChild(makeEl('h2','h2','Consejo rápido'));
  right.appendChild(makeEl('p','p','Activa la geolocalización para ver tu posición en el mapa y seguir la ruta a pie.'));
  g.appendChild(left); g.appendChild(right);
  c.appendChild(g); root.appendChild(c);
}
export function renderProfile(root){
  root.replaceChildren();
  const c=makeEl('div','container','');
  const card=makeEl('section','card pad','');
  card.appendChild(makeEl('h1','h1','Perfil rápido'));
  card.appendChild(makeEl('p','p','Solo necesitamos tu nombre y una foto o avatar. Se guarda en tu dispositivo.'));
  const form=document.createElement('form'); form.noValidate=true;
  const f1=makeEl('div','field','');
  const l1=makeEl('label','label','Nombre'); l1.setAttribute('for','inpName');
  const inp=document.createElement('input'); inp.className='input'; inp.id='inpName'; inp.type='text'; inp.placeholder='Escribe tu nombre';
  f1.appendChild(l1); f1.appendChild(inp);
  const f2=makeEl('div','field','');
  const l2=makeEl('label','label','Foto (opcional)'); l2.setAttribute('for','inpPhoto');
  const file=document.createElement('input'); file.className='input'; file.id='inpPhoto'; file.type='file'; file.accept='image/*';
  f2.appendChild(l2); f2.appendChild(file);
  const actions=makeEl('div','row spread','');
  const back=makeEl('a','btn btn-ghost','Volver'); back.href='#/welcome';
  const save=makeEl('button','btn btn-primary','Guardar y continuar'); save.type='submit';
  actions.appendChild(back); actions.appendChild(save);
  const prof=ensureProfile(true); if(prof&&prof.name) inp.value=prof.name;
  form.appendChild(f1); form.appendChild(f2); form.appendChild(actions);
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name=inp.value.trim();
    if(!name){ if(window.RT_TOAST) window.RT_TOAST('Por favor, escribe tu nombre.'); inp.focus(); return; }
    const next={ name, avatar:'', photoDataUrl:'' };
    const f=file.files && file.files[0] ? file.files[0] : null;
    if(f){ try{ next.photoDataUrl=await readFileAsDataURL(f);}catch{} }
    saveProfile(next);
    if(window.RT_TOAST) window.RT_TOAST('Perfil guardado.');
    window.location.hash='#/ruta';
  });
  card.appendChild(form); c.appendChild(card); root.appendChild(c);
}
