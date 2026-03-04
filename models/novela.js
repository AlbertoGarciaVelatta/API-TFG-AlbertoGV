const mongoose = require('mongoose');

const novelaSchema = new mongoose.Schema({
    // El campo _id no se define aquí porque Mongoose/MongoDB lo crea automáticamente.
    titulo: { 
        type: String, 
        required: true,
        trim: true // Limpia espacios en blanco accidentales
    },
    sinopsis: { 
        type: String, 
        default: "" 
    },
    genero: { 
        type: String, 
        default: "Otros" 
    },
    contenido: { 
        type: String, 
        required: true 
    },
    autorId: { 
        type: String, 
        required: true,
        index: true // Optimiza la búsqueda de "Mis Novelas"
    },
    esPublica: { 
        type: Boolean, 
        default: false 
    },
    ultimaActualizacion: { 
        type: Number, 
        default: Date.now 
    }
}, {
    // Esta configuración asegura que el _id sea fácil de leer para Gson en Android
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índice compuesto opcional para evitar que un mismo autor tenga dos novelas 
// con el mismo título exacto (evita duplicados lógicos)
novelaSchema.index({ titulo: 1, autorId: 1 });

// Exportamos el modelo vinculándolo a la colección "Novelas" en Atlas
module.exports = mongoose.model('NovelaUsuario', novelaSchema, "Novelas");