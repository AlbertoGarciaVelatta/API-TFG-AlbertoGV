const mongoose = require('mongoose');

const novelaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    sinopsis: String,
    genero: String,
    contenido: String,
    autorId: { type: String, required: true }, // UID de Firebase del autor
    esPublica: { type: Boolean, default: false }, // ¿Visible para todos?
    ultimaActualizacion: { type: Number, default: Date.now } // Timestamp para comparar versiones
});

// Índice para búsqueda rápida por autor
novelaSchema.index({ autorId: 1 });

module.exports = mongoose.model('NovelaUsuario', novelaSchema, "Novelas");