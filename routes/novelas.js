const express = require('express');
const router = express.Router();
const NovelaUsuario = require('../models/novela');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────
// MURO DE LA COMUNIDAD
// Soporta búsqueda por título, autor, género y paginación
// ─────────────────────────────────────────────────────────────
router.get("/novelas_publicas", async (req, res) => {
    try {
        const { titulo, autor, genero, page = 1, limit = 20 } = req.query;
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

        const limiteEntero = parseInt(limit);
        const saltar = (parseInt(page) - 1) * limiteEntero;

        // Proyección explícita: incluimos capitulos para que siempre viajen al cliente
        const novelas = await NovelaUsuario.find(filtro)
            .skip(saltar)
            .limit(limiteEntero)
            .select('titulo sinopsis genero autorId esPublica ultimaActualizacion puntuacionMedia capitulos comentarios');

        res.json(novelas);
    } catch (err) {
        console.error("Error en novelas_publicas:", err);
        res.status(500).json({ error: "Error al obtener novelas" });
    }
});

// ─────────────────────────────────────────────────────────────
// MIS NOVELAS — Novelas de un autor específico
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// RECOMENDACIONES — Top 5 mejor valoradas y públicas
// ─────────────────────────────────────────────────────────────
router.get("/recomendaciones", async (req, res) => {
    try {
        const recomendadas = await NovelaUsuario.find({ esPublica: true })
            .sort({ puntuacionMedia: -1 })
            .limit(5)
            // Igual que en novelas_publicas: incluimos capitulos explícitamente
            .select('titulo sinopsis genero autorId esPublica ultimaActualizacion puntuacionMedia capitulos comentarios');
        res.json(recomendadas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener recomendaciones" });
    }
});

// ─────────────────────────────────────────────────────────────
// SINCRONIZAR — Guarda la novela completa con sus capítulos
//
// FIX CRÍTICO: Separamos los campos que el cliente puede
// actualizar de los que NO debe sobrescribir accidentalmente.
// En concreto, usamos $set selectivo en lugar de esparcir
// todo req.body, para que un cliente Android desactualizado
// no machaque 'esPublica' con false por error.
// ─────────────────────────────────────────────────────────────
router.post('/novelas_usuarios', async (req, res) => {
    try {
        const { _id, titulo, autorId, esPublica, sinopsis, genero, capitulos, ultimaActualizacion } = req.body;

        if (!titulo || !autorId) {
            return res.status(400).json({ error: "Título y autorId obligatorios" });
        }

        let criterioBusqueda = {};
        if (_id && mongoose.Types.ObjectId.isValid(_id)) {
            criterioBusqueda = { _id: _id };
        } else {
            criterioBusqueda = {
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' },
                autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' }
            };
        }

        // Solo actualizamos los campos que el cliente manda explícitamente.
        // 'esPublica' solo se toca si el cliente lo incluye en el body.
        const camposAActualizar = {
            titulo,
            autorId,
            sinopsis: sinopsis ?? "",
            genero: genero ?? "Otros",
            capitulos: capitulos ?? [],
            ultimaActualizacion: ultimaActualizacion ?? Date.now(),
        };

        // Si el cliente manda esPublica (true o false), lo aplicamos.
        // Si no lo manda, no lo tocamos (para no machacar la visibilidad).
        if (typeof esPublica === 'boolean') {
            camposAActualizar.esPublica = esPublica;
        }

        const novelaSincronizada = await NovelaUsuario.findOneAndUpdate(
            criterioBusqueda,
            { $set: camposAActualizar },
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

// ─────────────────────────────────────────────────────────────
// COMENTARIOS — Añadir reseña a una novela
// ─────────────────────────────────────────────────────────────
router.post("/:id/comentarios", async (req, res) => {
    const id = req.params.id;
    const { usuario, texto, estrellas, titulo, autorId } = req.body;

    try {
        if (!usuario || !estrellas) {
            return res.status(400).json({ error: "El usuario y las estrellas son obligatorios" });
        }

        let novela = null;

        if (id && mongoose.Types.ObjectId.isValid(id)) {
            novela = await NovelaUsuario.findById(id);
        }

        // Plan B: buscar por título y autor si el ID no resuelve
        if (!novela && titulo && autorId) {
            novela = await NovelaUsuario.findOne({
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' },
                autorId: { $regex: `^${autorId.trim()}$`, $options: 'i' }
            });
        }

        if (!novela) {
            return res.status(404).json({ error: "No se encontró la novela" });
        }

        novela.comentarios.push({
            usuario,
            texto: texto || "",
            estrellas: Number(estrellas),
            fecha: new Date()
        });

        const sumaEstrellas = novela.comentarios.reduce((sum, c) => sum + c.estrellas, 0);
        novela.puntuacionMedia = sumaEstrellas / novela.comentarios.length;

        await novela.save();
        res.status(201).json(novela);
    } catch (err) {
        console.error("Error al añadir comentario:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ─────────────────────────────────────────────────────────────
// BORRAR NOVELA
// ─────────────────────────────────────────────────────────────
router.delete('/novelas_usuarios', async (req, res) => {
    try {
        const { id, titulo, autorId } = req.query;

        if (id && mongoose.Types.ObjectId.isValid(id)) {
            const resultado = await NovelaUsuario.findByIdAndDelete(id);
            if (resultado) return res.status(200).json({ mensaje: "Borrado por ID con éxito" });
        }

        if (titulo && autorId) {
            const borrado = await NovelaUsuario.findOneAndDelete({
                titulo: { $regex: `^${titulo.trim()}$`, $options: 'i' },
                autorId: autorId.trim()
            });
            if (borrado) return res.status(200).json({ mensaje: "Borrado por título con éxito" });
        }

        res.status(404).json({ error: "No se encontró la novela para borrar" });
    } catch (err) {
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;