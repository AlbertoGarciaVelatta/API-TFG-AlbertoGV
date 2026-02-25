// 1. Cargar variables de entorno (.env)
//require("dotenv").config();  // importa las rutas definidas en routes/animales.js.

// 2. Importar dependencias
const express = require("express");
//const mongoose = require("mongoose");

// 3. Crear instancia de Express
const app = express();

// 4. Importar las rutas
const librosRouter = require("./routes/libros"); // <-- aquí importas tus rutas
const novelasRouter = require("./routes/novelas");

// 5. Middleware para analizar JSON
app.use(express.json());  //Asume que esas rutas estarán disponibles bajo el prefijo /api.
app.use("/api", librosRouter);
app.use("/api", novelasRouter);

module.exports = app;  // 👈 Exportamos app para usarlo en index.js

// Por ejemplo. En libros.js defines una ruta router.get("/libros")
//              En el navegador o Android accedes a http://localhost:3000/api/libros