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
  const container = makeEl('div','container','');
  const prof = ensureProfile(false);

  if(!prof || !prof.name){
    // ===== Pantalla profile1 (primera vez) =====
    const card = makeEl('section','card pad welcome-card','');

    const icon = makeEl('div','welcome-icon','🍢');
    const h1 = makeEl('h1','welcome-title','Bienvenido a RutaTapas');
    const brand = makeEl('div','welcome-brand','NachusS');
    const hint = makeEl('div','small welcome-hint','Sube una foto o elige un avatar y escribe tu nombre.');

    const form = document.createElement('form');
    form.noValidate = true;

    function assetUrl(p){
      try{ return new URL(p, document.baseURI).toString(); }catch(_e){ return p; }
    }

    // Foto
    const photoWrap = makeEl('div','photo-uploader','');
    const photoBtn = makeEl('label','photo-btn','');
    photoBtn.setAttribute('for','inpPhoto');
    const cam = makeEl('div','photo-cam','📷');
    const txt = makeEl('div','photo-txt','Subir foto');
    photoBtn.appendChild(cam);
    photoBtn.appendChild(txt);

    const plus = makeEl('div','photo-plus','+');
    photoWrap.appendChild(photoBtn);
    photoWrap.appendChild(plus);

    const inpPhoto = document.createElement('input');
    inpPhoto.type = 'file';
    inpPhoto.accept = 'image/*';
    inpPhoto.id = 'inpPhoto';
    inpPhoto.className = 'hidden';
    photoWrap.appendChild(inpPhoto);

    // Avatares
    const avatarTitle = makeEl('div','avatar-title','o elige un avatar');
    const avatars = makeEl('div','avatar-row','');
    const avatarFiles = [
      // estructura actual del proyecto
      'assets/images/avatares/avatar_01.jpg',
      'assets/images/avatares/avatar_02.jpg',
      'assets/images/avatares/avatar_03.jpg',
      'assets/images/avatares/avatar_04.jpg',
      // alternativa (si algún día se usa assets/avatars)
      'assets/avatars/avatar_01.jpg',
      'assets/avatars/avatar_02.jpg',
      'assets/avatars/avatar_03.jpg',
      'assets/avatars/avatar_04.jpg'
    ];

    let selectedAvatar = avatarFiles[0];

    // Vista previa (foto o avatar)
    const preview = document.createElement('img');
    preview.className = 'photo-preview';
    preview.alt = 'Vista previa';
    preview.src = assetUrl(selectedAvatar);
    preview.addEventListener('error', ()=>{
      try{
        const idx = Number((selectedAvatar.match(/avatar_(\d+)/)||[])[1]||'1');
        const fb = 'assets/images/avatares/avatar_' + String(idx).padStart(2,'0') + '.jpg';
        preview.src = assetUrl(fb);
        selectedAvatar = fb;
      }catch(_e){}
    });
    photoWrap.appendChild(preview);

    function setPreview(src){
      preview.src = src;
    }
    function selectAvatar(path){
      selectedAvatar = path;
      avatars.querySelectorAll('button').forEach(b=>{
        b.classList.toggle('is-selected', b.getAttribute('data-src') === path);
      });
      if(!chosenPhotoDataUrl){
        setPreview(assetUrl(path));
      }
    }

    const avatarChoices = avatarFiles.slice(0,4);
    const avatarFallbacks = avatarFiles.slice(4);

    avatarChoices.forEach((src, idx)=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-btn' + (idx===0 ? ' is-selected' : '');
      b.setAttribute('data-src', src);
      b.setAttribute('aria-label', 'Seleccionar avatar ' + (idx+1));
      const img = document.createElement('img');
      img.src = assetUrl(src);
      img.alt = 'Avatar ' + (idx+1);
      img.addEventListener('error', ()=>{
        for(const fb of avatarFallbacks){
          if(fb.endsWith('avatar_0' + (idx+1) + '.jpg')){
            img.src = assetUrl(fb);
            b.setAttribute('data-src', fb);
            if(idx===0) selectedAvatar = fb;
            break;
          }
        }
      });
      b.appendChild(img);
      b.addEventListener('click', (e)=>{ e.preventDefault(); selectAvatar(b.getAttribute('data-src')); });
      avatars.appendChild(b);
    });
      avatars.appendChild(b);
    });

    // Nombre
    const field = makeEl('div','field','');
    const lab = makeEl('label','label','¿Cómo te llamas?');
    lab.setAttribute('for','inpName');
    const inpName = document.createElement('input');
    inpName.className = 'input';
    inpName.id = 'inpName';
    inpName.type = 'text';
    inpName.placeholder = 'Tu nombre...';
    field.appendChild(lab);
    field.appendChild(inpName);

    const submit = makeEl('button','btn btn-primary btn-big','Crear Perfil y Empezar →');
    submit.type = 'submit';

    const legal = makeEl('div','small welcome-legal','Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.');

    let chosenPhotoDataUrl = '';

    inpPhoto.addEventListener('change', async ()=>{
      const f = inpPhoto.files && inpPhoto.files[0] ? inpPhoto.files[0] : null;
      if(!f) return;
      try{
        chosenPhotoDataUrl = await readFileAsDataURL(f);
        cam.textContent = '✅';
        txt.textContent = 'Foto lista';
        setPreview(chosenPhotoDataUrl);
      }catch{
        chosenPhotoDataUrl = '';
      }
    });

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = inpName.value.trim();
      if(!name){
        if(window.RT_TOAST) window.RT_TOAST('Por favor, escribe tu nombre.');
        inpName.focus();
        return;
      }
      const next = { name, avatar: selectedAvatar, photoDataUrl: chosenPhotoDataUrl };
      saveProfile(next);
      if(window.RT_TOAST) window.RT_TOAST('Perfil creado.');
      window.location.hash = '#/seleccionar';
    });

    card.appendChild(icon);
    card.appendChild(h1);
    card.appendChild(brand);
    card.appendChild(photoWrap);
    card.appendChild(avatarTitle);
    card.appendChild(avatars);
    card.appendChild(hint);
    form.appendChild(field);
    form.appendChild(submit);
    card.appendChild(form);
    card.appendChild(legal);

    container.appendChild(card);
    root.appendChild(container);
    return;
  }

  // ===== Pantalla profile2 (usuario existente) =====
  const card = makeEl('section','card pad welcome2-card','');

  const top = makeEl('div','welcome2-top','');
  const t1 = makeEl('div','welcome2-title','RutaTapas v2.0');
  const t2 = makeEl('div','welcome2-handle','@' + prof.name);
  top.appendChild(t1); top.appendChild(t2);

  const avatarWrap = makeEl('div','welcome2-avatar','');
  const img = document.createElement('img');
  img.alt = 'Foto de perfil';
  img.src = prof.photoDataUrl ? prof.photoDataUrl : (prof.avatar || 'assets/images/avatares/avatar_01.jpg');
  avatarWrap.appendChild(img);

  const badge = makeEl('div','welcome2-badge','Foodie Experto');
  avatarWrap.appendChild(badge);

  const hello = makeEl('div','welcome2-hello','¡Hola de nuevo, ' + prof.name + '!');
  const sub = makeEl('div','small welcome2-sub','tus tapas te están esperando.');

  const btn = makeEl('a','btn btn-primary btn-big','Continuar mi Ruta  🧭');
  btn.href = '#/ruta';

  const change = makeEl('div','small welcome2-change','¿No eres tú? ');
  const a = document.createElement('a');
  a.href = '#/welcome';
  a.textContent = 'Cambiar de cuenta';
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    localStorage.removeItem('rt_profile');
    if(window.RT_TOAST) window.RT_TOAST('Perfil eliminado. Crea uno nuevo.');
    window.location.hash = '#/welcome';
  });
  change.appendChild(a);

  card.appendChild(top);
  card.appendChild(avatarWrap);
  card.appendChild(hello);
  card.appendChild(sub);
  card.appendChild(btn);
  card.appendChild(change);

  container.appendChild(card);
  root.appendChild(container);
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
