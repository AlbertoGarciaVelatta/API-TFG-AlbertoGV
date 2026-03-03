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



// novelas.js - RUTA DELETE CORREGIDA
// novelas.js (Servidor)
router.delete('/novelas_usuarios', async (req, res) => {
    const titulo = req.query.titulo ? decodeURIComponent(req.query.titulo).trim() : null;
    const autorId = req.query.autorId ? req.query.autorId.trim() : null;

    console.log(`Buscando para borrar: Título='${titulo}', Autor='${autorId}'`);

    try {
        // Ponemos el autorId también con regex insensible a mayúsculas por seguridad
        const resultado = await NovelaUsuario.findOneAndDelete({ 
            titulo: { $regex: `^${titulo}$`, $options: 'i' }, 
            autorId: { $regex: `^${autorId}$`, $options: 'i' } 
        });

        if (resultado) {
            console.log("✅ Documento encontrado y eliminado");
            res.status(200).json({ mensaje: "Borrado OK" });
        } else {
            // Esto es lo que te está pasando ahora
            console.log("❌ No se encontró coincidencia exacta en Atlas");
            res.status(404).json({ error: "No encontrado" });
        }
    } catch (err) {
        console.error("Error en DELETE:", err);
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;