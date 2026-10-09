require('dotenv').config();

// Render funciona en hora UTC, por eso usamos siempre la hora de Argentina
const ZONA = 'America/Argentina/Salta';

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Ventanas horarias permitidas (se pueden cambiar en .env)
function ventanas() {
  return {
    ingreso: {
      desde: process.env.INGRESO_DESDE || '18:30',
      hasta: process.env.INGRESO_HASTA || '19:30'
    },
    egreso: {
      desde: process.env.EGRESO_DESDE || '21:30',
      hasta: process.env.EGRESO_HASTA || '22:30'
    }
  };
}

// Fecha y hora actual del sistema en Argentina
function ahora(fechaBase = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(fechaBase);

  const p = {};
  partes.forEach((x) => { p[x.type] = x.value; });

  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}:${p.second}`,
    minutos: Number(p.hour) * 60 + Number(p.minute)
  };
}

// Devuelve 'ingreso', 'egreso' o null según el horario
function ventanaActual(minutos) {
  const v = ventanas();
  if (minutos >= aMinutos(v.ingreso.desde) && minutos <= aMinutos(v.ingreso.hasta)) return 'ingreso';
  if (minutos >= aMinutos(v.egreso.desde) && minutos <= aMinutos(v.egreso.hasta)) return 'egreso';
  return null;
}

// Decide qué puede hacer la persona AHORA según horario y lo que ya registró hoy
function decidirAccion(asistencia, minutos) {
  const v = ventanas();
  const prueba = process.env.MODO_PRUEBA === 'true';

  const ventana = prueba
    ? (asistencia && asistencia.hora_ingreso ? 'egreso' : 'ingreso')
    : ventanaActual(minutos);

  if (!ventana) {
    return {
      accion: null,
      mensaje: `Fuera de horario. Ingreso: ${v.ingreso.desde} a ${v.ingreso.hasta}. Egreso: ${v.egreso.desde} a ${v.egreso.hasta}.`
    };
  }

  if (ventana === 'ingreso') {
    if (asistencia && asistencia.hora_ingreso) {
      return { accion: null, mensaje: `Ya registraste tu ingreso a las ${asistencia.hora_ingreso}.` };
    }
    return { accion: 'ingreso', mensaje: 'Podés registrar tu ingreso.' };
  }

  // ventana === 'egreso'
  if (!asistencia || !asistencia.hora_ingreso) {
    return { accion: null, mensaje: 'No tenés un ingreso registrado hoy. Avisale al administrador.' };
  }
  if (asistencia.hora_egreso) {
    return { accion: null, mensaje: `Ya registraste tu egreso a las ${asistencia.hora_egreso}.` };
  }
  return { accion: 'egreso', mensaje: 'Podés registrar tu egreso.' };
}

module.exports = { ahora, ventanaActual, decidirAccion, ventanas };
