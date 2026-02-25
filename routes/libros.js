const express = require("express");
const router = express.Router();
const Libro = require("../models/libro");
const getNextSequence = require("../helpers/getNextSequence");

// GET todos los libros
router.get("/", async (req, res) => {
    try {
        const libros = await Libro.find(); 
        res.json(libros);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener los libros" });
    }
});

// GET un libro por ID
router.get("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const libroEncontrado = await Libro.findOne({ id: id });
        if (!libroEncontrado) return res.status(404).json({ error: "Libro no encontrado" });
        res.json(libroEncontrado);
    } catch (err) {
        res.status(500).json({ error: "Error al buscar el libro" });
    }
});

// POST crear nuevo libro
router.post("/", async (req, res) => {
    try {
        const nextId = await getNextSequence("librosid"); 
        const nuevo = new Libro({ ...req.body, id: nextId });
        const guardado = await nuevo.save();
        res.status(201).json(guardado);
    } catch (err) {
        res.status(500).json({ error: "Error al guardar el libro" });
    }
});

// POST añadir comentario (CON VALIDACIÓN DE USUARIO)
router.post("/:id/comentario", async (req, res) => {
    const id = parseInt(req.params.id);
    const { usuario, texto, estrellas } = req.body;

    // Bloqueo de seguridad para evitar anónimos
    if (!usuario || usuario.trim() === "" || usuario.toLowerCase() === "usuario anónimo") {
        return res.status(401).json({ error: "Se requiere identificación real de Firebase" });
    }

    try {
        const libro = await Libro.findOne({ id: id });
        if (!libro) return res.status(404).json({ error: "Libro no encontrado" });

        const nuevoComentario = {
            usuario,
            texto,
            estrellas: parseInt(estrellas),
            fecha: new Date()
        };

        libro.comentarios.push(nuevoComentario);

        // Recalcular puntuación media y número de críticas
        const totalEstrellas = libro.comentarios.reduce((acc, c) => acc + c.estrellas, 0);
        libro.puntuacionMedia = parseFloat((totalEstrellas / libro.comentarios.length).toFixed(1));
        libro.numeroCriticas = libro.comentarios.length;

        await libro.save();
        res.status(201).json(libro);
    } catch (err) {
        res.status(500).json({ error: "Error al añadir el comentario" });
    }
});

// PUT actualizar libro
router.put("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const actualizado = await Libro.findOneAndUpdate({ id: id }, req.body, { new: true });
        if (!actualizado) return res.status(404).json({ error: "Libro no encontrado" });
        res.json(actualizado);
    } catch (err) {
        res.status(500).json({ error: "Error al actualizar el libro" });
    }
});

// DELETE eliminar libro
router.delete("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const eliminado = await Libro.findOneAndDelete({ id: id });
        if (!eliminado) return res.status(404).json({ error: "Libro no encontrado" });
        res.json({ mensaje: "Libro eliminado correctamente" });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar el libro" });
    }
});

module.exports = router;