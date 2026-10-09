const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const multer = require("multer");
const sequelize = require("./config");

require("./relaciones");

const Persona = require("./modelos/Persona");
const Asistencia = require("./modelos/Asistencia");
const { subirFoto, urlFirmada } = require("./supabase");
const { ahora, decidirAccion } = require("./utils/horario");

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Sirve la página web (carpeta public)
app.use(express.static(path.join(__dirname, "public")));

// Las fotos llegan en memoria (máx. 3 MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 }
});

// =============================================
// RUTAS PARA ALUMNOS Y DOCENTES
// =============================================

// Ingreso con DNI: devuelve quién es y qué puede hacer ahora
app.get("/api/estado/:dni", async (req, res) => {
    try {
        const persona = await Persona.findOne({ where: { dni: req.params.dni } });
        if (!persona) {
            return res.status(404).json({ mensaje: "DNI no registrado. Consultá con el administrador." });
        }

        const { fecha, hora, minutos } = ahora();
        const asistencia = await Asistencia.findOne({
            where: { id_persona: persona.id_persona, fecha }
        });
        const decision = decidirAccion(asistencia, minutos);

        res.json({
            persona: { nombre: persona.nombre, apellido: persona.apellido, tipo: persona.tipo },
            fecha,
            hora,
            ingreso: asistencia ? asistencia.hora_ingreso : null,
            egreso: asistencia ? asistencia.hora_egreso : null,
            accion: decision.accion,
            mensaje: decision.mensaje
        });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
});

// Recibe la foto y guarda la asistencia con la hora del sistema
app.post("/api/asistencia", upload.single("foto"), async (req, res) => {
    try {
        const { dni } = req.body;
        if (!dni || !req.file) {
            return res.status(400).json({ mensaje: "Faltan el DNI o la foto." });
        }

        const persona = await Persona.findOne({ where: { dni } });
        if (!persona) {
            return res.status(404).json({ mensaje: "DNI no registrado." });
        }

        // El servidor vuelve a validar el horario (no se puede engañar desde el navegador)
        const { fecha, hora, minutos } = ahora();
        let asistencia = await Asistencia.findOne({
            where: { id_persona: persona.id_persona, fecha }
        });
        const decision = decidirAccion(asistencia, minutos);

        if (!decision.accion) {
            return res.status(403).json({ mensaje: decision.mensaje });
        }

        const nombreArchivo = `${fecha}/${dni}_${decision.accion}_${hora.replace(/:/g, "-")}.jpg`;
        await subirFoto(nombreArchivo, req.file.buffer);

        if (!asistencia) {
            asistencia = await Asistencia.create({ id_persona: persona.id_persona, fecha });
        }

        if (decision.accion === "ingreso") {
            asistencia.hora_ingreso = hora;
            asistencia.foto_ingreso = nombreArchivo;
        } else {
            asistencia.hora_egreso = hora;
            asistencia.foto_egreso = nombreArchivo;
        }
        await asistencia.save();

        res.status(201).json({ mensaje: `¡Listo! ${decision.accion === "ingreso" ? "Ingreso" : "Egreso"} registrado a las ${hora}.` });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
});

// =============================================
// RUTAS DEL ADMINISTRADOR (requieren la clave)
// =============================================

function soloAdmin(req, res, next) {
    const clave = req.get("x-admin-clave");
    if (!process.env.ADMIN_CLAVE || clave !== process.env.ADMIN_CLAVE) {
        return res.status(401).json({ mensaje: "Clave de administrador incorrecta." });
    }
    next();
}

app.get("/api/admin/verificar", soloAdmin, (req, res) => {
    res.json({ mensaje: "ok" });
});

// Registrar un alumno o docente
app.post("/api/admin/personas", soloAdmin, async (req, res) => {
    try {
        const persona = await Persona.create(req.body);
        res.status(201).json(persona);
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
});

app.get("/api/admin/personas", soloAdmin, async (req, res) => {
    try {
        const personas = await Persona.findAll({ order: [["apellido", "ASC"]] });
        res.json(personas);
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
});

// Tabla de asistencias de un día (por defecto, hoy)
app.get("/api/admin/asistencias", soloAdmin, async (req, res) => {
    try {
        const fecha = req.query.fecha || ahora().fecha;
        const asistencias = await Asistencia.findAll({
            where: { fecha },
            include: [Persona],
            order: [[Persona, "apellido", "ASC"]]
        });

        const filas = await Promise.all(asistencias.map(async (a) => ({
            id_asistencia: a.id_asistencia,
            nombre: a.Persona.nombre,
            apellido: a.Persona.apellido,
            dni: a.Persona.dni,
            direccion: a.Persona.direccion,
            tipo: a.Persona.tipo,
            fecha: a.fecha,
            hora_ingreso: a.hora_ingreso,
            hora_egreso: a.hora_egreso,
            url_foto_ingreso: await urlFirmada(a.foto_ingreso),
            url_foto_egreso: await urlFirmada(a.foto_egreso)
        })));

        res.json(filas);
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
});

// El administrador registra o corrige la hora de llegada / salida a mano
app.post("/api/admin/asistencias", soloAdmin, async (req, res) => {
    try {
        const { dni, fecha, hora_ingreso, hora_egreso } = req.body;
        const formatoHora = /^\d{2}:\d{2}(:\d{2})?$/;

        if (!dni) return res.status(400).json({ mensaje: "Falta el DNI." });
        if (hora_ingreso && !formatoHora.test(hora_ingreso)) return res.status(400).json({ mensaje: "Hora de ingreso inválida (usá HH:MM)." });
        if (hora_egreso && !formatoHora.test(hora_egreso)) return res.status(400).json({ mensaje: "Hora de egreso inválida (usá HH:MM)." });

        const persona = await Persona.findOne({ where: { dni } });
        if (!persona) return res.status(404).json({ mensaje: "DNI no registrado." });

        const dia = fecha || ahora().fecha;
        const [asistencia] = await Asistencia.findOrCreate({
            where: { id_persona: persona.id_persona, fecha: dia }
        });

        if (hora_ingreso) asistencia.hora_ingreso = hora_ingreso;
        if (hora_egreso) asistencia.hora_egreso = hora_egreso;
        await asistencia.save();

        res.json({ mensaje: "Asistencia guardada." });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
});

// =============================================
// ARRANQUE
// =============================================
const PORT = process.env.PORT || 3001;

sequelize.sync({ alter: true })
.then(() => {
    console.log("Base sincronizada");

    app.listen(PORT, () => {
        console.log("Servidor en puerto " + PORT);
    });
})
.catch(err => {
    console.log(err);
});
