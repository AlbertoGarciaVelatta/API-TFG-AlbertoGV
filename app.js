const express = require('express');
const cors    = require('cors');
const app     = express();

// ── Firebase Admin SDK ───────────────────────────────────────
// Inicialización única — debe ir ANTES de cargar las rutas.
// serviceAccountKey.json se descarga desde Firebase Console →
// Configuración del proyecto → Cuentas de servicio.
// ⚠️  Nunca subas este archivo a un repositorio público.
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// ── Rutas ────────────────────────────────────────────────────
const librosRouter  = require('./routes/libros');
const novelasRouter = require('./routes/novelas');
const adminRouter   = require('./routes/admin');

app.use(cors());
app.use(express.json());

app.use('/api/libros',  librosRouter);
app.use('/api/novelas', novelasRouter);
app.use('/api/admin',   adminRouter);   // ← nuevo

module.exports = app;