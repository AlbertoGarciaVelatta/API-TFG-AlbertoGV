const mongoose = require("mongoose");

const LibroSchema = new mongoose.Schema({
  id: Number,
  titulo: String,
  autor: String,
  anioPublicacion: Number,
  editorial: String,
  genero: String,
  paginas: Number,
  disponible: Boolean,
});

module.exports = mongoose.model("Libro", LibroSchema, "Libreria"); //cambia la exportacion a libreria a Libreria