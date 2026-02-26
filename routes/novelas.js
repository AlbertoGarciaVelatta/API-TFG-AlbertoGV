const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela'); 

// 1. OBTENER MIS NOVELAS (Privadas y Públicas del autor)
router.get('/novelas_usuarios', async (req, res) => {
    const { autorId } = req.query;
    if (!autorId) return res.status(400).json({ error: "Falta autorId" });

    try {
        const novelas = await NovelaUsuario.find({ autorId: autorId });
        res.json(novelas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener tus novelas" });
    }
});

// 2. SINCRONIZAR (Guardar o Actualizar)
router.post('/novelas_usuarios', async (req, res) => {
    const { titulo, autorId } = req.body;
    try {
        // Limpiamos espacios para evitar errores de búsqueda futuros
        const tituloLimpio = titulo ? titulo.trim() : "";
        const autorIdLimpio = autorId ? autorId.trim() : "";

        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            { titulo: tituloLimpio, autorId: autorIdLimpio },
            { ...req.body, titulo: tituloLimpio, autorId: autorIdLimpio, ultimaActualizacion: Date.now() },
            { new: true, upsert: true }
        );
        res.json(novelaSincronizada);
    } catch (err) {
        res.status(500).json({ error: "Error en la sincronización" });
    }
});

// 3. OBTENER NOVELAS PÚBLICAS
router.get('/novelas_publicas', async (req, res) => {
    try {
        const publicas = await NovelaUsuario.find({ esPublica: true });
        res.json(publicas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener novelas públicas" });
    }
});

// 4. ELIMINAR NOVELA (Corregido para manejar títulos con espacios)
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        // decodeURIComponent es vital si el título tiene espacios o tildes
        const titulo = req.query.titulo ? decodeURIComponent(req.query.titulo).trim() : null;
        const autorId = req.query.autorId ? req.query.autorId.trim() : null;

        if (!titulo || !autorId) {
            return res.status(400).json({ error: "Faltan parámetros: titulo y autorId" });
        }

        const resultado = await NovelaUsuario.findOneAndDelete({ 
            titulo: titulo, 
            autorId: autorId 
        });

        if (resultado) {
            console.log(`✅ Eliminado: "${titulo}" del autor ${autorId}`);
            res.status(200).json({ mensaje: "Borrado OK" });
        } else {
            console.log(`❌ No hallado: [${titulo}] - [${autorId}]`);
            res.status(404).json({ error: "No encontrado en la base de datos" });
        }
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;