// Importar la conexion a la base de datos
const sequelize = require("../config");
// Importar DataTypes de Sequelize
const { DataTypes } = require("sequelize");

// Una Persona puede ser alumno o docente
const Persona = sequelize.define("Persona", {

    id_persona: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    dni: {
        type: DataTypes.STRING(10),
        unique: true,
        allowNull: false
    },

    apellido: {
        type: DataTypes.STRING(30),
        allowNull: false
    },

    nombre: {
        type: DataTypes.STRING(30),
        allowNull: false
    },

    direccion: {
        type: DataTypes.STRING(100),
        allowNull: true
    },

    tipo: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: { isIn: [["alumno", "docente"]] }
    }

});

module.exports = Persona;
