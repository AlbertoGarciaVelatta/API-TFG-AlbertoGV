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

// novelas.js

// 2. SINCRONIZAR (POST) - Corregido para evitar duplicados si solo cambias el contenido
router.post('/novelas_usuarios', async (req, res) => {
    try {
        // Limpiamos agresivamente
        const titulo = req.body.titulo ? req.body.titulo.trim() : "";
        const autorId = req.body.autorId ? req.body.autorId.trim() : "";

        if (!titulo || !autorId) return res.status(400).send("Datos incompletos");

        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            { 
                titulo: { $regex: `^${titulo}$`, $options: 'i' }, // Búsqueda insensible a mayúsculas
                autorId: autorId 
            },
            { ...req.body, titulo, autorId, ultimaActualizacion: Date.now() },
            { new: true, upsert: true }
        );
        res.status(200).json(novelaSincronizada);
    } catch (err) {
        res.status(500).json({ error: "Error al sincronizar" });
    }
});

// 4. ELIMINAR (DELETE) - Con Logs para ver el error real
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        // Usamos decodeURIComponent y limpiamos espacios
        const titulo = req.query.titulo ? decodeURIComponent(req.query.titulo).trim() : null;
        const autorId = req.query.autorId ? req.query.autorId.trim() : null;

        console.log(`Intentando borrar: [${titulo}] de [${autorId}]`);

        // Buscamos ignorando mayúsculas para asegurar el match
        const resultado = await NovelaUsuario.findOneAndDelete({ 
            titulo: { $regex: `^${titulo}$`, $options: 'i' },
            autorId: autorId 
        });

        if (resultado) {
            console.log("✅ Borrado de MongoDB");
            res.status(200).json({ mensaje: "Borrado OK" });
        } else {
            console.log("❌ No se encontró en MongoDB");
            res.status(404).json({ error: "No existe" });
        }
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
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