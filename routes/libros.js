const express = require("express");
const router = express.Router();
const Libro = require("../models/libro"); // Usamos siempre Mayúscula para el Modelo
const getNextSequence = require("../helpers/getNextSequence");

// GET todos
router.get("/libros", async (req, res) => {
  try {
    const libros = await Libro.find(); 
    res.json(libros);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener los libros" });
  }
});

// GET por ID
router.get("/libros/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Cambiamos el nombre de la constante para no chocar con el Modelo
    const libroEncontrado = await Libro.findOne({ id: id });

    if (!libroEncontrado) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }
    res.json(libroEncontrado);
  } catch (err) {
    res.status(500).json({ error: "Error al buscar el libro" });
  }
});

// POST crear
router.post("/libros", async (req, res) => {
  try {
    const nextId = await getNextSequence("librosid"); 
    // Asegúrate de que req.body traiga 'anioPublicacion' y 'paginas' sin caracteres especiales
    const nuevo = new Libro({ ...req.body, id: nextId });
    const guardado = await nuevo.save();
    res.json(guardado);
  } catch (err) {
    console.error(err); // Útil para ver el error real en la terminal
    res.status(500).json({ error: "Error al guardar el libro" });
  }
});

// PUT reemplazo completo
router.put("/libros/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const actualizado = await Libro.findOneAndUpdate(
      { id: id },
      req.body,
      { new: true }
    );

    if (!actualizado) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }
    res.json(actualizado);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar el libro" });
  }
});

// DELETE
router.delete("/libros/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const eliminado = await Libro.findOneAndDelete({ id: id });
    if (!eliminado) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }
    res.json({ mensaje: "Libro eliminado correctamente", libro: eliminado });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar el libro" });
  }
});

module.exports = router;