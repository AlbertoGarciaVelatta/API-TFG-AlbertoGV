const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela'); // Asegúrate de que la ruta sea correcta

// 1. OBTENER MIS NOVELAS (Privadas y Públicas del autor)
// GET /api/novelas_usuarios?autorId=...
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
// POST /api/novelas_usuarios
router.post('/novelas_usuarios', async (req, res) => {
    const { titulo, autorId } = req.body;

    try {
        // Buscamos por título y autor. Si existe, actualiza. Si no, crea (upsert).
        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            { titulo: titulo, autorId: autorId },
            { ...req.body, ultimaActualizacion: Date.now() }, // Forzamos actualización de fecha
            { new: true, upsert: true }
        );
        res.json(novelaSincronizada);
    } catch (err) {
        res.status(500).json({ error: "Error en la sincronización" });
    }
});

// 3. OBTENER NOVELAS PÚBLICAS (Muro de la comunidad)
// GET /api/novelas_publicas
router.get('/novelas_publicas', async (req, res) => {
    try {
        // Buscamos todas las que tengan esPublica: true, sin importar el autor
        const publicas = await NovelaUsuario.find({ esPublica: true });
        res.json(publicas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener novelas públicas" });
    }
});

// Ruta para eliminar una novela cuando el usuario la pone privada
router.delete('/novelas_usuarios', async (req, res) => {
    const { titulo, autorId } = req.query; // <--- CAMBIO AQUÍ

    try {
        const resultado = await NovelaUsuario.findOneAndDelete({ 
            titulo: titulo, 
            autorId: autorId 
        });

        if (resultado) {
            res.json({ mensaje: "Novela eliminada de MongoDB" });
        } else {
            res.status(404).json({ error: "No se encontró la novela para borrar" });
        }
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar" });
    }
});

module.exports = router;