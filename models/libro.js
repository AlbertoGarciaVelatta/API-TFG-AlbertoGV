const mongoose = require("mongoose");

// 1. Definimos la estructura del comentario
const ComentarioSchema = new mongoose.Schema({
  usuario: String,
  texto: String,
  estrellas: { type: Number, min: 1, max: 5 },
  fecha: { type: Date, default: Date.now }
});

// 2. Definimos el esquema del Libro
const LibroSchema = new mongoose.Schema({
  // Nota: Mongo crea un _id automáticamente, pero si quieres conservar tu id manual:
  id: Number, 
  titulo: String,
  autor: String,
  anioPublicacion: Number,
  editorial: String,
  genero: String,
  paginas: Number,
  disponible: Boolean,
  
  // --- NUEVOS CAMPOS ---
  sinopsis: { type: String, default: "" },
  puntuacionMedia: { type: Number, default: 0 },
  numeroCriticas: { type: Number, default: 0 },
  
  // Aquí es donde "embebes" los comentarios como un array
  comentarios: [ComentarioSchema] 
});

module.exports = mongoose.model("Libro", LibroSchema, "Libreria");