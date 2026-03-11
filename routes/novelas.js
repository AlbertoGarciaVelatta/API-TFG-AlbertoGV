const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela'); // Importación correcta
const mongoose = require('mongoose');

// MURO DE LA COMUNIDAD - Soporta búsqueda por título, autor y género
router.get("/novelas_publicas", async (req, res) => {
    try {
        const { titulo, autor, genero } = req.query;
        let filtro = { esPublica: true }; // Solo novelas marcadas como públicas

        if (titulo && titulo.trim() !== "") {
            filtro.titulo = { $regex: titulo.trim(), $options: 'i' };
        }

    if (autor && autor.trim() !== "") {
    filtro.autorId = { $regex: autor.trim(), $options: 'i' };
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

// SINCRONIZAR (POST) - Crea o actualiza una novela sin duplicarla
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

router.post("/:id/comentarios", async (req, res) => {
    const id = req.params.id; // El _id de Mongo de la novela
    
    try {
        // 1. Validar que el ID sea correcto
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID de novela no válido" });
        }

        // 2. Buscar la novela en la base de datos
        const novela = await NovelaUsuario.findById(id);
        if (!novela) {
            return res.status(404).json({ error: "Novela no encontrada" });
        }

        // 3. Extraer los datos del comentario que envía la App de Android
        const { usuario, texto, estrellas } = req.body;

        if (!usuario || !estrellas) {
            return res.status(400).json({ error: "El usuario y las estrellas son obligatorios" });
        }

        // 4. Crear el objeto del nuevo comentario
        const nuevoComentario = {
            usuario: usuario,
            texto: texto || "", // Si no escriben texto, se guarda vacío
            estrellas: estrellas,
            fecha: new Date()
        };

        // 5. Añadirlo al array de la novela y guardar
        novela.comentarios.push(nuevoComentario);
        await novela.save();

        // Devolvemos la novela actualizada a la App
        res.status(201).json(novela);
        
    } catch (err) {
        console.error("Error al añadir comentario a la novela:", err);
        res.status(500).json({ error: "Error al añadir el comentario" });
    }
});

// En novelas.js
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        const { id, titulo, autorId } = req.query;
        
        // VALIDACIÓN: Solo intentamos borrar por ID si es un ObjectId válido de 24 caracteres
        if (id && mongoose.Types.ObjectId.isValid(id)) {
            const resultado = await NovelaUsuario.findByIdAndDelete(id);
            if (resultado) return res.status(200).json({ mensaje: "Borrado por ID con éxito" });
        }

        // PLAN B: Si el ID no era válido o no se encontró, usamos Título y Autor
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