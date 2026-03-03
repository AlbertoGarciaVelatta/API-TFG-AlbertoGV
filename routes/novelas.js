const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela'); 

// 1. MURO DE LA COMUNIDAD (Obtener todas las novelas PÚBLICAS de todos los usuarios)
router.get('/novelas_publicas', async (req, res) => {
    try {
        // Filtramos para que solo devuelva las que tienen esPublica: true
        const novelas = await NovelaUsuario.find({ esPublica: true });
        console.log(`Cargando muro: ${novelas.length} novelas públicas encontradas`);
        res.json(novelas);
    } catch (err) {
        console.error("Error en muro comunidad:", err);
        res.status(500).json({ error: "Error al obtener el muro de la comunidad" });
    }
});

// 2. MIS NOVELAS (Obtener todas las novelas de un autor específico)
router.get('/novelas_usuarios', async (req, res) => {
    const { autorId } = req.query;
    if (!autorId) return res.status(400).json({ error: "Falta autorId" });

    try {
        // Buscamos por autorId ignorando mayúsculas/minúsculas para evitar fallos de Firebase
        const novelas = await NovelaUsuario.find({ 
            autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' } 
        });
        res.json(novelas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener tus novelas" });
    }
});

// 3. SINCRONIZAR (POST) - Crea o actualiza una novela
router.post('/novelas_usuarios', async (req, res) => {
    try {
        const titulo = req.body.titulo ? req.body.titulo.trim() : "";
        const autorId = req.body.autorId ? req.body.autorId.trim() : "";

        if (!titulo || !autorId) return res.status(400).send("Datos incompletos");

        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            { 
                titulo: { $regex: `^${titulo}$`, $options: 'i' }, 
                autorId: { $regex: `^${autorId}$`, $options: 'i' } 
            },
            { 
                ...req.body, 
                titulo, 
                autorId, 
                ultimaActualizacion: Date.now() // 'v' minúscula para coincidir con Atlas
            },
            { new: true, upsert: true }
        );
        console.log(`Novela sincronizada: ${titulo}`);
        res.status(200).json(novelaSincronizada);
    } catch (err) {
        console.error("Error en sincronización:", err);
        res.status(500).json({ error: "Error al sincronizar" });
    }
});

// 4. BORRAR (DELETE) - Elimina novela de la nube
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
            console.log(`Borrado exitoso: ${titulo}`);
            res.status(200).json({ mensaje: "Borrado OK" });
        } else {
            res.status(404).json({ error: "No encontrado en Atlas" });
        }
    } catch (err) {
        console.error("Error en borrado:", err);
        res.status(500).json({ error: "Error interno al borrar" });
    }
});

module.exports = router;