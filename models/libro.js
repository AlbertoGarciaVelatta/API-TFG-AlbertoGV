const mongoose = require("mongoose");

// ── Comentario ───────────────────────────────────────────────
const ComentarioSchema = new mongoose.Schema({
    id:       { type: String },
    usuario:  { type: String, required: true },
    texto:    { type: String },
    fecha:    { type: String },
    estrellas:{ type: Number, min: 1, max: 5 }
});

// ── Registro de alquiler ─────────────────────────────────────
// Cada entrada representa un ejemplar que está fuera de la
// biblioteca en manos de un usuario concreto.
const AlquilerSchema = new mongoose.Schema({
    userId:          { type: String, required: true },  // UID de Firebase
    nombreUsuario:   { type: String, required: true },  // Display name o email
    fechaAlquiler:   { type: Date,   default: Date.now },
    fechaDevolucion: { type: Date,   default: null }     // null = aún no devuelto
});

// ── Libro ────────────────────────────────────────────────────
const LibroSchema = new mongoose.Schema({
    id:              { type: Number },
    titulo:          { type: String },
    autor:           { type: String },
    anioPublicacion: { type: Number },
    editorial:       { type: String },
    genero:          { type: String },
    paginas:         { type: Number },

    // Eliminamos 'disponible: Boolean' — la disponibilidad
    // se calcula en tiempo real como (stockDisponible > 0).

    sinopsis:        { type: String,  default: "" },
    puntuacionMedia: { type: Number,  default: 0 },
    numeroCriticas:  { type: Number,  default: 0 },

    // ── NUEVO: Imagen de portada ─────────────────────────────
    // URL de Firebase Storage. Vacía si no se ha subido portada.
    portadaUrl:      { type: String,  default: "" },

    // ── NUEVO: Control de stock ──────────────────────────────
    // stockTotal     = número de ejemplares físicos en la biblioteca
    // stockDisponible= ejemplares que se pueden alquilar ahora mismo
    //                  (se recalcula automáticamente al alquilar/devolver)
    stockTotal:      { type: Number,  default: 0 },
    stockDisponible: { type: Number,  default: 0 },

    // ── NUEVO: Alquilados ────────────────────────────────────
    // Array de usuarios que tienen un ejemplar ahora mismo.
    // Su longitud es siempre (stockTotal - stockDisponible).
    alquilados: [AlquilerSchema],

    comentarios: [ComentarioSchema]
});

// ── Virtual: disponible ──────────────────────────────────────
// Calculado en tiempo real para que el cliente no dependa de
// un campo booleano que podría desincronizarse.
LibroSchema.virtual("disponible").get(function () {
    return this.stockDisponible > 0;
});

LibroSchema.set("toJSON",   { virtuals: true });
LibroSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Libro", LibroSchema, "Libreria");