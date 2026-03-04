const express = require("express");
const router = express.Router();
const Libro = require("../models/libro");
const getNextSequence = require("../helpers/getNextSequence");

// GET todos los libros
// En tu servidor: routes/libros.js

router.get("/", async (req, res) => {
    try {
        const { titulo, autor, genero } = req.query;
        let filtro = {};

        // Solo añadimos al filtro si el usuario ha escrito algo
        if (titulo && titulo.trim() !== "") {
            filtro.titulo = { $regex: titulo.trim(), $options: 'i' }; // 'i' es para ignorar mayúsculas
        }
        if (autor && autor.trim() !== "") {
            filtro.autor = { $regex: autor.trim(), $options: 'i' };
        }
        if (genero && genero !== "Todos" && genero.trim() !== "") {
            filtro.genero = genero;
        }

        console.log("Buscando con filtro:", filtro); // Esto aparecerá en los logs de Render
        
        // AHORA SÍ: Usamos el filtro en la consulta
        const libros = await Libro.find(filtro); 
        res.json(libros);
    } catch (err) {
        console.error("Error en búsqueda:", err);
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
router.post("/:id/comentarios", async (req, res) => {
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