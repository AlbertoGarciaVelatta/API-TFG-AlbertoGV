const express = require("express");
const router = express.Router();
const Libro = require("../models/libro");
const getNextSequence = require("../helpers/getNextSequence");

// ─────────────────────────────────────────────────────────────
// GET todos los libros (con filtros y paginación)
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const { titulo, autor, genero, page = 1, limit = 10 } = req.query;
        let filtro = {};

        if (titulo && titulo.trim() !== "") filtro.titulo = { $regex: titulo.trim(), $options: 'i' };
        if (autor  && autor.trim()  !== "") filtro.autor  = { $regex: autor.trim(),  $options: 'i' };
        if (genero && genero !== "Todos" && genero.trim() !== "") filtro.genero = genero;

        const limiteEntero = parseInt(limit);
        const saltar = (parseInt(page) - 1) * limiteEntero;

        const libros = await Libro.find(filtro).skip(saltar).limit(limiteEntero);
        res.json(libros);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener los libros" });
    }
});

// ─────────────────────────────────────────────────────────────
// GET un libro por ID
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const libro = await Libro.findOne({ id });
        if (!libro) return res.status(404).json({ error: "Libro no encontrado" });
        res.json(libro);
    } catch (err) {
        res.status(500).json({ error: "Error al buscar el libro" });
    }
});

// ─────────────────────────────────────────────────────────────
// POST crear nuevo libro
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const nextId = await getNextSequence("librosid");
        // stockDisponible arranca igual a stockTotal si no se especifica
        const { stockTotal = 0, stockDisponible } = req.body;
        const nuevo = new Libro({
            ...req.body,
            id: nextId,
            stockTotal,
            stockDisponible: stockDisponible ?? stockTotal
        });
        const guardado = await nuevo.save();
        res.status(201).json(guardado);
    } catch (err) {
        res.status(500).json({ error: "Error al guardar el libro" });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT actualizar libro (datos generales, portada, stock)
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const actualizado = await Libro.findOneAndUpdate({ id }, req.body, { new: true });
        if (!actualizado) return res.status(404).json({ error: "Libro no encontrado" });
        res.json(actualizado);
    } catch (err) {
        res.status(500).json({ error: "Error al actualizar el libro" });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE eliminar libro
// ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const eliminado = await Libro.findOneAndDelete({ id });
        if (!eliminado) return res.status(404).json({ error: "Libro no encontrado" });
        res.json({ mensaje: "Libro eliminado correctamente" });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar el libro" });
    }
});

// ─────────────────────────────────────────────────────────────
// POST comentario
// ─────────────────────────────────────────────────────────────
router.post("/:id/comentarios", async (req, res) => {
    const id = parseInt(req.params.id);
    const { usuario, texto, estrellas } = req.body;

    if (!usuario || usuario.trim() === "" || usuario.toLowerCase() === "usuario anónimo") {
        return res.status(401).json({ error: "Se requiere identificación real de Firebase" });
    }

    try {
        const libro = await Libro.findOne({ id });
        if (!libro) return res.status(404).json({ error: "Libro no encontrado" });

        libro.comentarios.push({ usuario, texto, estrellas: parseInt(estrellas), fecha: new Date() });

        const totalEstrellas = libro.comentarios.reduce((acc, c) => acc + c.estrellas, 0);
        libro.puntuacionMedia = parseFloat((totalEstrellas / libro.comentarios.length).toFixed(1));
        libro.numeroCriticas  = libro.comentarios.length;

        await libro.save();
        res.status(201).json(libro);
    } catch (err) {
        res.status(500).json({ error: "Error al añadir el comentario" });
    }
});

// ─────────────────────────────────────────────────────────────
// GET recomendaciones — Top 5 mejor valorados
// ─────────────────────────────────────────────────────────────
router.get("/recomendaciones", async (req, res) => {
    try {
        const recomendadas = await Libro.find()
            .sort({ puntuacionMedia: -1 })
            .limit(5);
        res.json(recomendadas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener recomendaciones" });
    }
});

// ═════════════════════════════════════════════════════════════
// ENDPOINTS DE ALQUILER (solo accesibles con rol trabajador)
// El middleware de roles se aplicará en app.js cuando lo añadas.
// ═════════════════════════════════════════════════════════════

// POST /:id/alquilar — registrar un nuevo alquiler
// Body: { userId, nombreUsuario }
router.post("/:id/alquilar", async (req, res) => {
    const id = parseInt(req.params.id);
    const { userId, nombreUsuario } = req.body;

    if (!userId || !nombreUsuario) {
        return res.status(400).json({ error: "userId y nombreUsuario son obligatorios" });
    }

    try {
        const libro = await Libro.findOne({ id });
        if (!libro) return res.status(404).json({ error: "Libro no encontrado" });

        if (libro.stockDisponible <= 0) {
            return res.status(409).json({ error: "No hay ejemplares disponibles" });
        }

        // Comprobamos que este usuario no tenga ya un ejemplar
        const yaAlquilado = libro.alquilados.some(a => a.userId === userId && !a.fechaDevolucion);
        if (yaAlquilado) {
            return res.status(409).json({ error: "Este usuario ya tiene un ejemplar en préstamo" });
        }

        libro.alquilados.push({ userId, nombreUsuario });
        libro.stockDisponible -= 1;

        await libro.save();
        res.status(201).json(libro);
    } catch (err) {
        console.error("Error al registrar alquiler:", err);
        res.status(500).json({ error: "Error al registrar el alquiler" });
    }
});

// DELETE /:id/alquilar/:userId — registrar devolución
router.delete("/:id/alquilar/:userId", async (req, res) => {
    const id = parseInt(req.params.id);
    const { userId } = req.params;

    try {
        const libro = await Libro.findOne({ id });
        if (!libro) return res.status(404).json({ error: "Libro no encontrado" });

        const registro = libro.alquilados.find(a => a.userId === userId && !a.fechaDevolucion);
        if (!registro) {
            return res.status(404).json({ error: "No se encontró un alquiler activo para este usuario" });
        }

        // Marcamos la fecha de devolución en lugar de borrar el registro
        // (así conservamos el historial)
        registro.fechaDevolucion = new Date();
        libro.stockDisponible += 1;

        await libro.save();
        res.json(libro);
    } catch (err) {
        console.error("Error al registrar devolución:", err);
        res.status(500).json({ error: "Error al registrar la devolución" });
    }
});

// GET /:id/alquilados — lista de quién tiene el libro ahora
router.get("/:id/alquilados", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const libro = await Libro.findOne({ id });
        if (!libro) return res.status(404).json({ error: "Libro no encontrado" });

        // Solo los alquileres activos (sin fecha de devolución)
        const activos = libro.alquilados.filter(a => !a.fechaDevolucion);
        res.json(activos);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener alquilados" });
    }
});

module.exports = router;