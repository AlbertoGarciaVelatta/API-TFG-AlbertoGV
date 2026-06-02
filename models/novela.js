const mongoose = require('mongoose');

// 1. Definimos la estructura del comentario
const ComentarioSchema = new mongoose.Schema({
  usuario: String,
  texto: String,
  estrellas: { type: Number, min: 1, max: 5 },
  fecha: { type: Date, default: Date.now }
});

// --- Esquema para los Capítulos ---
const CapituloSchema = new mongoose.Schema({
    idLocal: { type: String }, 
    numero: { type: Number, required: true },
    titulo: { type: String, default: "Sin título" },
    contenido: { type: String, required: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const novelaSchema = new mongoose.Schema({
    titulo: { type: String, required: true, trim: true },
    sinopsis: { type: String, default: "" },
    genero: { type: String, default: "Otros" },
    autorId: { type: String, required: true, index: true },
    esPublica: { type: Boolean, default: false },
    ultimaActualizacion: { type: Number, default: Date.now },
    
    // CORRECCIÓN: Agregamos la propiedad para que guarde y ordene las notas medias
    puntuacionMedia: { type: Number, default: 0 }, 
    
    // Array de Capítulos
    capitulos: [CapituloSchema],
    
    comentarios: [ComentarioSchema] 
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

novelaSchema.index({ titulo: 1, autorId: 1 });

module.exports = mongoose.model('NovelaUsuario', novelaSchema, "Novelas");