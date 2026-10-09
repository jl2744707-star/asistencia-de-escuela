const $ = (id) => document.getElementById(id);
let dniActual = null;
let stream = null;

function mostrarMensaje(texto, tipo = '') {
  const m = $('mensaje');
  m.textContent = texto;
  m.className = tipo;
}

async function prenderCamara() {
  if (stream) return;
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: false
  });
  $('video').srcObject = stream;
}

function apagarCamara() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

// Consulta al servidor quién es y qué puede hacer ahora
async function mostrarEstado() {
  const r = await fetch('/api/estado/' + encodeURIComponent(dniActual));
  const e = await r.json();
  if (!r.ok) throw new Error(e.mensaje || 'Error');

  $('paso1').hidden = true;
  $('paso2').hidden = false;
  $('saludo').textContent = `Hola, ${e.persona.nombre} ${e.persona.apellido} (${e.persona.tipo})`;
  $('estado').textContent = `Hoy ${e.fecha} · Ingreso: ${e.ingreso || '—'} · Egreso: ${e.egreso || '—'}`;

  if (e.accion) {
    $('btnFoto').textContent = e.accion === 'ingreso'
      ? 'Sacar foto y registrar INGRESO'
      : 'Sacar foto y registrar EGRESO';
    $('camara').hidden = false;
    await prenderCamara();
    mostrarMensaje('');
  } else {
    $('camara').hidden = true;
    apagarCamara();
    mostrarMensaje(e.mensaje, 'aviso');
  }
}

$('btnEntrar').addEventListener('click', async () => {
  const dni = $('dni').value.trim();
  if (!/^\d{6,10}$/.test(dni)) {
    return mostrarMensaje('Escribí tu DNI usando solo números.', 'error');
  }
  dniActual = dni;
  try {
    await mostrarEstado();
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
      mostrarMensaje('No se pudo usar la cámara. Permití el acceso en el navegador.', 'error');
    } else {
      mostrarMensaje(err.message, 'error');
    }
  }
});

$('btnFoto').addEventListener('click', async () => {
  const btn = $('btnFoto');
  const video = $('video');
  const canvas = $('canvas');

  // Dibuja el cuadro actual del video y lo convierte en imagen JPG
  const ancho = 640;
  const alto = Math.round(video.videoHeight * (ancho / video.videoWidth));
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d').drawImage(video, 0, 0, ancho, alto);
  const foto = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.8));

  const datos = new FormData();
  datos.append('dni', dniActual);
  datos.append('foto', foto, 'foto.jpg');

  btn.disabled = true;
  try {
    const r = await fetch('/api/asistencia', { method: 'POST', body: datos });
    const d = await r.json();
    if (!r.ok) throw new Error(d.mensaje || 'Error');
    await mostrarEstado();
    mostrarMensaje(d.mensaje, 'ok');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

$('btnSalir').addEventListener('click', () => {
  apagarCamara();
  dniActual = null;
  $('dni').value = '';
  $('paso2').hidden = true;
  $('paso1').hidden = false;
  mostrarMensaje('');
});
