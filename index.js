require("dotenv").config(); 
const mongoose = require("mongoose");
const app = require("./app");

const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

if (!uri) {
  console.error("❌ MONGODB_URI no definida en el archivo .env");
  process.exit(1);
}

// Eliminamos las opciones obsoletas para evitar avisos amarillos en consola
mongoose.connect(uri)
.then(() => {
  console.log("✅ Conectado a MongoDB Atlas");
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  });
})
.catch((err) => {
  console.error("❌ Error al conectar a MongoDB:", err);
});