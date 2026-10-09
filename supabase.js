// Cliente de Supabase Storage (donde se guardan las fotos)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el archivo .env (o en Render)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BUCKET = 'fotos';

// Sube una foto (Buffer) y devuelve la ruta guardada
async function subirFoto(ruta, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error('No se pudo guardar la foto: ' + error.message);
  return ruta;
}

// Genera un link temporal (1 hora) para ver una foto privada
async function urlFirmada(ruta) {
  if (!ruta) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 3600);
  return data ? data.signedUrl : null;
}

module.exports = { subirFoto, urlFirmada };
