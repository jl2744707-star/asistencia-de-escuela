const $ = (id) => document.getElementById(id);
let clave = sessionStorage.getItem('clave') || '';

function mostrarMensaje(texto, tipo = '') {
  $('mensaje').textContent = texto;
  $('mensaje').className = tipo;
}

// Función común para llamar a la API mandando la clave
async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', 'x-admin-clave': clave }
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.mensaje || 'Error');
  return d;
}

function celda(fila, texto) {
  const td = document.createElement('td');
  td.textContent = texto ?? '—';   // textContent evita que se inyecte HTML
  fila.appendChild(td);
  return td;
}

function linkFoto(td, texto, url) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.textContent = texto + ' ';
  td.appendChild(a);
}

async function cargarTabla() {
  const fecha = $('fechaVer').value;
  const filas = await api('/api/admin/asistencias' + (fecha ? '?fecha=' + fecha : ''));
  const cuerpo = $('cuerpo');
  cuerpo.innerHTML = '';

  if (filas.length === 0) {
    const tr = document.createElement('tr');
    const td = celda(tr, 'No hay registros para esta fecha.');
    td.colSpan = 8;
    cuerpo.appendChild(tr);
    return;
  }

  filas.forEach((f) => {
    const tr = document.createElement('tr');
    celda(tr, f.nombre);
    celda(tr, f.apellido);
    celda(tr, f.dni);
    celda(tr, f.direccion);
    celda(tr, f.tipo === 'docente' ? 'Docente' : 'Alumno');
    celda(tr, f.hora_ingreso);
    celda(tr, f.hora_egreso);
    const tdFotos = celda(tr, '');
    linkFoto(tdFotos, 'Ingreso', f.url_foto_ingreso);
    linkFoto(tdFotos, 'Egreso', f.url_foto_egreso);
    if (!f.url_foto_ingreso && !f.url_foto_egreso) tdFotos.textContent = '—';
    cuerpo.appendChild(tr);
  });
}

async function entrarAlPanel() {
  await api('/api/admin/verificar');
  sessionStorage.setItem('clave', clave);
  $('login').hidden = true;
  $('panel').hidden = false;
  await cargarTabla();
}

$('btnLogin').addEventListener('click', async () => {
  clave = $('clave').value;
  try {
    await entrarAlPanel();
    mostrarMensaje('');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

$('btnVer').addEventListener('click', () => cargarTabla().catch((e) => mostrarMensaje(e.message, 'error')));

$('btnManual').addEventListener('click', async () => {
  try {
    const d = await api('/api/admin/asistencias', {
      method: 'POST',
      body: JSON.stringify({
        dni: $('mDni').value.trim(),
        fecha: $('mFecha').value || undefined,
        hora_ingreso: $('mIngreso').value || undefined,
        hora_egreso: $('mEgreso').value || undefined
      })
    });
    mostrarMensaje(d.mensaje, 'ok');
    await cargarTabla();
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

$('btnPersona').addEventListener('click', async () => {
  try {
    await api('/api/admin/personas', {
      method: 'POST',
      body: JSON.stringify({
        nombre: $('pNombre').value.trim(),
        apellido: $('pApellido').value.trim(),
        dni: $('pDni').value.trim(),
        direccion: $('pDireccion').value.trim(),
        tipo: $('pTipo').value
      })
    });
    mostrarMensaje('Persona registrada correctamente.', 'ok');
    ['pNombre', 'pApellido', 'pDni', 'pDireccion'].forEach((id) => { $(id).value = ''; });
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
});

// Si ya había entrado antes en esta pestaña, entra directo
if (clave) entrarAlPanel().catch(() => { sessionStorage.removeItem('clave'); });
