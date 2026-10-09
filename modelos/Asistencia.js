// Importar la conexion a la base de datos
const sequelize = require("../config");
// Importar DataTypes de Sequelize
const { DataTypes } = require("sequelize");

// Un registro por persona y por día (con ingreso y egreso)
const Asistencia = sequelize.define("Asistencia", {

    id_asistencia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    id_persona: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },

    hora_ingreso: {
        type: DataTypes.TIME,
        allowNull: true
    },

    hora_egreso: {
        type: DataTypes.TIME,
        allowNull: true
    },

    foto_ingreso: {
        type: DataTypes.STRING(255),
        allowNull: true
    },

    foto_egreso: {
        type: DataTypes.STRING(255),
        allowNull: true
    }

}, {
    // No puede haber dos registros de la misma persona el mismo día
    indexes: [{ unique: true, fields: ["id_persona", "fecha"] }]
});

module.exports = Asistencia;
