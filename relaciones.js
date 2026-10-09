const sequelize = require("./config");

const Persona = require("./modelos/Persona");
const Asistencia = require("./modelos/Asistencia");

// Persona 1:N Asistencia
Persona.hasMany(Asistencia, { foreignKey: "id_persona" });
Asistencia.belongsTo(Persona, { foreignKey: "id_persona" });

module.exports = { sequelize, Persona, Asistencia };
