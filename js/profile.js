const LS_PROFILE = 'rt_profile';

function safeJSONParse(str){
  try{ return JSON.parse(str); }catch{ return null; }
}

export function ensureProfile(createIfMissing=true){
  const raw = localStorage.getItem(LS_PROFILE);
  const data = raw ? safeJSONParse(raw) : null;
  if(data && data.name) return data;
  if(!createIfMissing) return null;
  const blank = { name:'', avatar:'', photoDataUrl:'' };
  localStorage.setItem(LS_PROFILE, JSON.stringify(blank));
  return blank;
}

function saveProfile(p){
  localStorage.setItem(LS_PROFILE, JSON.stringify(p));
}

function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}

function readFileAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(String(r.result || ''));
    r.onerror = ()=> reject(new Error('No se pudo leer la imagen.'));
    r.readAsDataURL(file);
  });
}

function assetUrl(p){
  try{ return new URL(p, document.baseURI).toString(); }catch{ return p; }
}

export function renderWelcome(root){
  root.replaceChildren();
  const container = makeEl('div','container','');
  const prof = ensureProfile(false);

  if(!prof || !prof.name){
    // ===== profile1: crear perfil =====
    const card = makeEl('section','card pad welcome-card','');

    card.appendChild(makeEl('div','welcome-icon','🍢'));
    card.appendChild(makeEl('h1','welcome-title','Bienvenido a RutaTapas'));
    card.appendChild(makeEl('div','welcome-brand','NachusS'));
    card.appendChild(makeEl('div','small welcome-hint','Sube una foto o elige un avatar y escribe tu nombre.'));

    const form = document.createElement('form');
    form.noValidate = true;

    // Foto + vista previa
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

    const avatarTitle = makeEl('div','avatar-title','o elige un avatar');
    const avatars = makeEl('div','avatar-row','');

    const avatarFiles = [
      'assets/avatars/avatar_01.jpg',
      'assets/avatars/avatar_02.jpg',
      'assets/avatars/avatar_03.jpg',
      'assets/avatars/avatar_04.jpg'
    ];

    let selectedAvatar = avatarFiles[0];
    let chosenPhotoDataUrl = '';

    // Preview
    const preview = document.createElement('img');
    preview.className = 'photo-preview';
    preview.alt = 'Vista previa';
    preview.src = assetUrl(selectedAvatar);
    preview.addEventListener('error', ()=>{ /* si falta, deja el círculo con UI */ });
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

    avatarFiles.forEach((src, idx)=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-btn' + (idx===0 ? ' is-selected' : '');
      b.setAttribute('data-src', src);
      b.setAttribute('aria-label', 'Seleccionar avatar ' + (idx+1));
      const img = document.createElement('img');
      img.src = assetUrl(src);
      img.alt = 'Avatar ' + (idx+1);
      b.appendChild(img);
      b.addEventListener('click', (e)=>{ e.preventDefault(); selectAvatar(src); });
      avatars.appendChild(b);
    });

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
        cam.textContent = '📷';
        txt.textContent = 'Subir foto';
      }
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

    card.appendChild(photoWrap);
    card.appendChild(avatarTitle);
    card.appendChild(avatars);

    form.appendChild(field);
    form.appendChild(submit);
    card.appendChild(form);

    card.appendChild(makeEl('div','small welcome-legal','Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.'));

    container.appendChild(card);
    root.appendChild(container);
    return;
  }

  // ===== profile2: usuario existente =====
  const card = makeEl('section','card pad welcome2-card','');

  const top = makeEl('div','welcome2-top','');
  top.appendChild(makeEl('div','welcome2-title','RutaTapas v2.0'));
  top.appendChild(makeEl('div','welcome2-handle','@' + prof.name));

  const avatarWrap = makeEl('div','welcome2-avatar','');
  const img = document.createElement('img');
  img.alt = 'Foto de perfil';
  img.src = prof.photoDataUrl ? prof.photoDataUrl : assetUrl(prof.avatar || 'assets/avatars/avatar_01.jpg');
  avatarWrap.appendChild(img);
  avatarWrap.appendChild(makeEl('div','welcome2-badge','Foodie Experto'));

  const hello = makeEl('div','welcome2-hello','¡Hola de nuevo, ' + prof.name + '!');
  const sub = makeEl('div','small welcome2-sub','tus tapas te están esperando.');

  const btn = makeEl('a','btn btn-primary btn-big','Continuar mi Ruta  🧭');
  btn.href = '#/seleccionar';

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
