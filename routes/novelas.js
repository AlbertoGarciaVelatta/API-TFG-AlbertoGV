const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela'); 
const mongoose = require('mongoose');

// MURO DE LA COMUNIDAD - Soporta búsqueda por título, autor y género
router.get("/novelas_publicas", async (req, res) => {
    try {
        const { titulo, autor, genero } = req.query;
        let filtro = { esPublica: true }; 

        if (titulo && titulo.trim() !== "") {
            filtro.titulo = { $regex: titulo.trim(), $options: 'i' };
        }

        if (autor && autor.trim() !== "") {
            filtro.autorId = { $regex: autor.trim(), $options: 'i' };
        }
        
        if (genero && genero !== "Todos" && genero.trim() !== "") {
            filtro.genero = genero;
        }

        const novelas = await NovelaUsuario.find(filtro); 
        res.json(novelas);
    } catch (err) {
        console.error("Error en novelas_publicas:", err);
        res.status(500).json({ error: "Error al obtener novelas" });
    }
});

// MIS NOVELAS - Obtiene las novelas privadas y públicas de un autor específico
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

// GET Recomendaciones (Top 5 mejor valoradas)
router.get("/recomendaciones", async (req, res) => {
    try {
        const recomendadas = await NovelaUsuario.find({ esPublica: true })
            .sort({ puntuacionMedia: -1 })
            .limit(5);
        res.json(recomendadas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener recomendaciones" });
    }
});

// SINCRONIZAR (POST) - Guarda la novela completa con sus capítulos
router.post('/novelas_usuarios', async (req, res) => {
    try {
        const { _id, titulo, autorId } = req.body;
        if (!titulo || !autorId) return res.status(400).json({ error: "Título y autorId obligatorios" });

        let criterioBusqueda = {};

        if (_id && mongoose.Types.ObjectId.isValid(_id)) {
            criterioBusqueda = { _id: _id };
        } else {
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
                new: true,   
                upsert: true, 
                setDefaultsOnInsert: true 
            }
        );

        res.status(200).json(novelaSincronizada);
    } catch (err) {
        console.error("Error sincronizando novela:", err);
        res.status(500).json({ error: "Error al sincronizar novela" });
    }
});

// ENVIAR COMENTARIO (CORREGIDO CON PLAN B Y CALCULO MEDIA)
router.post("/:id/comentarios", async (req, res) => {
    const id = req.params.id; 
    const { usuario, texto, estrellas, titulo, autorId } = req.body;

    try {
        if (!usuario || !estrellas) {
            return res.status(400).json({ error: "El usuario y las estrellas son obligatorios" });
        }

        let novela = null;

        // Intentar buscar primero por ID de Mongoose
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            novela = await NovelaUsuario.findById(id);
        }

        // PLAN B: Si el ID no es válido o no se encuentra (caso de sincronizaciones pendientes en Android),
        // buscamos por la combinación de Título y Autor provistos en el body.
        if (!novela && titulo && autorId) {
            novela = await NovelaUsuario.findOne({
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' },
                autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' }
            });
        }

        if (!novela) {
            return res.status(404).json({ error: "No se encontró la novela por ID ni por Título/Autor" });
        }

        // Crear el objeto del nuevo comentario
        const nuevoComentario = {
            usuario: usuario,
            texto: texto || "", 
            estrellas: Number(estrellas),
            fecha: new Date()
        };

        // Añadir el comentario al array
        novela.comentarios.push(nuevoComentario);

        // RECALCULO DE LA NOTA MEDIA GLOBAL
        const sumaEstrellas = novela.comentarios.reduce((sum, item) => sum + item.estrellas, 0);
        novela.puntuacionMedia = sumaEstrellas / novela.comentarios.length;

        await novela.save();
        res.status(201).json(novela);
        
    } catch (err) {
        console.error("Error al añadir comentario:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// BORRAR NOVELA
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        const { id, titulo, autorId } = req.query;
        
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            const resultado = await NovelaUsuario.findByIdAndDelete(id);
            if (resultado) return res.status(200).json({ mensaje: "Borrado por ID con éxito" });
        }

        if (titulo && autorId) {
            const borradoLegacy = await NovelaUsuario.findOneAndDelete({ 
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' }, 
                autorId: autorId.trim() 
            });
            if (borradoLegacy) return res.status(200).json({ mensaje: "Borrado por título con éxito" });
        }

        res.status(404).json({ error: "No se encontró la novela para borrar" });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;