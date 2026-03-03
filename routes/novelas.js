const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela'); 

// 1. OBTENER MIS NOVELAS
router.get('/novelas_usuarios', async (req, res) => {
    const { autorId } = req.query;
    if (!autorId) return res.status(400).json({ error: "Falta autorId" });

    try {
        // Usamos regex también aquí por si hay discrepancias de mayúsculas
        const novelas = await NovelaUsuario.find({ 
            autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' } 
        });
        res.json(novelas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener tus novelas" });
    }
});

// 2. SINCRONIZAR (POST) - CORREGIDO
router.post('/novelas_usuarios', async (req, res) => {
    try {
        const titulo = req.body.titulo ? req.body.titulo.trim() : "";
        const autorId = req.body.autorId ? req.body.autorId.trim() : "";

        if (!titulo || !autorId) return res.status(400).send("Datos incompletos");

        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            { 
                titulo: { $regex: `^${titulo}$`, $options: 'i' }, 
                autorId: { $regex: `^${autorId}$`, $options: 'i' } // Regex añadido para seguridad
            },
            { 
                ...req.body, 
                titulo, 
                autorId, 
                ultimaActualizacion: Date.now() // CORREGIDO: 'v' minúscula para coincidir con Atlas
            },
            { new: true, upsert: true }
        );
        res.status(200).json(novelaSincronizada);
    } catch (err) {
        console.error("Error en POST:", err);
        res.status(500).json({ error: "Error al sincronizar" });
    }
});

// 3. BORRAR (DELETE) - CORREGIDO
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        const titulo = req.query.titulo ? decodeURIComponent(req.query.titulo).trim() : null;
        const autorId = req.query.autorId ? req.query.autorId.trim() : null;

        if (!titulo || !autorId) return res.status(400).json({ error: "Faltan parámetros" });

        const resultado = await NovelaUsuario.findOneAndDelete({ 
            titulo: { $regex: `^${titulo}$`, $options: 'i' }, 
            autorId: { $regex: `^${autorId}$`, $options: 'i' } 
        });

        if (resultado) {
            res.status(200).json({ mensaje: "Borrado OK" });
        } else {
            res.status(404).json({ error: "No encontrado" });
        }
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;