const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela'); // Importación correcta
const mongoose = require('mongoose');

// 1. MURO DE LA COMUNIDAD - Soporta búsqueda por título, autor y género
router.get("/novelas_publicas", async (req, res) => {
    try {
        const { titulo, autor, genero } = req.query;
        let filtro = { esPublica: true }; // Solo novelas marcadas como públicas

        if (titulo && titulo.trim() !== "") {
            filtro.titulo = { $regex: titulo.trim(), $options: 'i' };
        }
        if (autor && autor.trim() !== "") {
            filtro.autor = { $regex: autor.trim(), $options: 'i' };
        }
        if (genero && genero !== "Todos" && genero.trim() !== "") {
            filtro.genero = genero;
        }

        // Corregido: Usamos NovelaUsuario que es el nombre del modelo importado
        const novelas = await NovelaUsuario.find(filtro); 
        res.json(novelas);
    } catch (err) {
        console.error("Error en novelas_publicas:", err);
        res.status(500).json({ error: "Error al obtener novelas" });
    }
});

// 2. MIS NOVELAS - Obtiene las novelas privadas y públicas de un autor específico
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

// 3. SINCRONIZAR (POST) - Crea o actualiza una novela sin duplicarla
router.post('/novelas_usuarios', async (req, res) => {
    try {
        const { _id, titulo, autorId } = req.body;
        if (!titulo || !autorId) return res.status(400).json({ error: "Título y autorId obligatorios" });

        let criterioBusqueda = {};

        // Si Android envía un _id de Mongo válido, buscamos por ID
        if (_id && mongoose.Types.ObjectId.isValid(_id)) {
            criterioBusqueda = { _id: _id };
        } else {
            // Si es nueva o no tenemos el ID, buscamos por combinación título/autor
            criterioBusqueda = { 
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' }, 
                autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' } 
            };
        }

        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            criterioBusqueda,
            { 
                ...req.body, 
                ultimaActualizacion: Date.now() 
            },
            { 
                new: true,   // Devuelve el objeto ya actualizado
                upsert: true, // Si no existe, lo crea
                setDefaultsOnInsert: true 
            }
        );

        res.status(200).json(novelaSincronizada);
    } catch (err) {
        console.error("Error sincronizando novela:", err);
        res.status(500).json({ error: "Error al sincronizar novela" });
    }
});

// 4. BORRAR (DELETE) - Borrado seguro por ID o Título
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        const { id, titulo, autorId } = req.query;
        
        // 1. Intento por ID (Lo que envía Android LibroApiService)
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            const resultado = await NovelaUsuario.findByIdAndDelete(id);
            if (resultado) return res.status(200).json({ mensaje: "Borrado por ID con éxito" });
        }

        // 2. Plan B: Por Título y Autor
        if (titulo && autorId) {
            const borradoLegacy = await NovelaUsuario.findOneAndDelete({ 
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' }, 
                autorId: autorId.trim() 
            });
            if (borradoLegacy) return res.status(200).json({ mensaje: "Borrado por título con éxito" });
        }

        res.status(404).json({ error: "No se encontró la novela para borrar" });
    } catch (err) {
        console.error("Error en DELETE:", err);
        res.status(500).json({ error: "Error interno al borrar" });
    }
});

module.exports = router;