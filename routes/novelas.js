const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela');
const mongoose = require('mongoose'); // Necesario para validar IDs

// 1. MURO DE LA COMUNIDAD (Sin cambios, sigue buscando todas las públicas)
router.get('/novelas_publicas', async (req, res) => {
    try {
        const novelas = await NovelaUsuario.find({ esPublica: true });
        res.json(novelas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener el muro" });
    }
});

// 2. MIS NOVELAS (Sin cambios, busca por autorId)
router.get('/novelas_usuarios', async (req, res) => {
    const { autorId } = req.query;
    if (!autorId) return res.status(400).json({ error: "Falta autorId" });
    try {
        const novelas = await NovelaUsuario.find({ 
            autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' } 
        });
        res.json(novelas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener tus novelas" });
    }
});

// 3. SINCRONIZAR (POST) - Versión Mejorada y Segura
router.post('/novelas_usuarios', async (req, res) => {
    try {
        const { _id, titulo, autorId } = req.body;
        
        let criterioBusqueda = {};

        // PRIORIDAD 1: Si tenemos un ID real de Mongo, buscamos por ese ID
        if (_id && mongoose.Types.ObjectId.isValid(_id)) {
            criterioBusqueda = { _id: _id };
        } 
        // PRIORIDAD 2: Si no hay ID, buscamos por Título y Autor (para evitar duplicar)
        else {
            criterioBusqueda = { 
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' }, 
                autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' } 
            };
        }

        // Ejecutamos la operación: 
        // - Si lo encuentra: lo actualiza.
        // - Si NO lo encuentra: lo crea (upsert: true).
        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            criterioBusqueda,
            { 
                ...req.body, 
                ultimaActualizacion: Date.now() 
            },
            { 
                new: true,    // Devuelve el documento ya actualizado/creado
                upsert: true, // Si no existe, lo crea
                setDefaultsOnInsert: true // Aplica valores por defecto del modelo
            }
        );

        console.log("Sincronización exitosa:", novelaSincronizada.titulo);
        res.status(200).json(novelaSincronizada);

    } catch (err) {
        console.error("Error sincronizando:", err);
        res.status(500).json({ error: "Error al sincronizar novela" });
    }
});

// 4. BORRAR (DELETE) - AHORA BORRA POR ID
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        const { id } = req.query; // Recibimos el id por parámetro

        if (id && mongoose.Types.ObjectId.isValid(id)) {
            const resultado = await NovelaUsuario.findByIdAndDelete(id);
            if (resultado) return res.status(200).json({ mensaje: "Borrado por ID con éxito" });
        }

        // Si falla por ID, mantenemos el borrado por título como respaldo (opcional)
        const { titulo, autorId } = req.query;
        const borradoLegacy = await NovelaUsuario.findOneAndDelete({ 
            titulo: { $regex: `^${titulo}$`, $options: 'i' }, 
            autorId: { $regex: `^${autorId}$`, $options: 'i' } 
        });

        if (borradoLegacy) res.status(200).json({ mensaje: "Borrado por título con éxito" });
        else res.status(404).json({ error: "No se encontró la novela" });

    } catch (err) {
        res.status(500).json({ error: "Error interno al borrar" });
    }
});

module.exports = router;