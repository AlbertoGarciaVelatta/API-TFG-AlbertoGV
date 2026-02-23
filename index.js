require("dotenv").config(); // Carga las variables del archivo .env
const mongoose = require("mongoose");
const app = require("./app");



const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;


if (!uri) {
  console.error("❌ MONGODB_URI no definida en el archivo .env");
  process.exit(1);
}

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Conectado a MongoDB Atlas");
  app.listen(PORT,'0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error("❌ Error al conectar a MongoDB:", err);
});

