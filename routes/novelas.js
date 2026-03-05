const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela');
const mongoose = require('mongoose'); // Necesario para validar IDs

// 1. MURO DE LA COMUNIDAD (Sin cambios, sigue buscando todas las públicas)
router.get("/novelas_publicas", async (req, res) => {
    try {
        const { titulo, autor, genero } = req.query;
        let filtro = { esPublica: true }; // Solo novelas públicas

        if (titulo) filtro.titulo = { $regex: titulo, $options: 'i' };
        if (autor) filtro.autor = { $regex: autor, $options: 'i' };
        if (genero && genero !== "Todos") filtro.genero = genero;

        const novelas = await Novela.find(filtro);
        res.json(novelas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener novelas públicas" });
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
        const { id, titulo, autorId } = req.query; // Extraemos todo del query
        console.log(`Intentando borrar novela. ID: ${id}, Título: ${titulo}`);

        // 1. Intento prioritario por ID (Lo que envía tu Android LibroApiService)
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            const resultado = await NovelaUsuario.findByIdAndDelete(id);
            if (resultado) {
                console.log("Borrado por ID con éxito");
                return res.status(200).json({ mensaje: "Borrado por ID con éxito" });
            }
        }

        // 2. Plan B: Borrado por Título y Autor (Legacy)
        if (titulo && autorId) {
            const borradoLegacy = await NovelaUsuario.findOneAndDelete({ 
                titulo: { $regex: `^${titulo}$`, $options: 'i' }, 
                // Usamos coincidencia exacta para autorId para evitar fallos de tipo
                autorId: autorId 
            });

            if (borradoLegacy) {
                console.log("Borrado por título con éxito");
                return res.status(200).json({ mensaje: "Borrado por título con éxito" });
            }
        }

        // 3. Si llegamos aquí, no se encontró nada
        console.warn("No se encontró la novela para borrar con los datos aportados");
        return res.status(404).json({ error: "No se encontró la novela" });

    } catch (err) {
        console.error("Error en DELETE novelas_usuarios:", err);
        return res.status(500).json({ error: "Error interno al borrar" });
    }
});

module.exports = router;