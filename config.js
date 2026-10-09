// Cargo las variables de entorno desde el archivo .env
require('dotenv').config();

// Requiero Sequelize
const { Sequelize } = require('sequelize');

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL en el archivo .env (o en las variables de Render)');
  process.exit(1);
}

// Supabase es PostgreSQL en la nube: se conecta con una sola URL y SSL
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Desactiva los logs SQL en consola
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

// Exporto la instancia de conexión
module.exports = sequelize;
