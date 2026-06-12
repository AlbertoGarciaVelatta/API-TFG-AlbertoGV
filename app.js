const express = require('express');
const cors    = require('cors');
const app     = express();

// ── Firebase Admin SDK ───────────────────────────────────────
// Lee las credenciales desde variable de entorno en producción
// o desde el archivo local en desarrollo.
const admin = require('firebase-admin');

if (!admin.apps.length) {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // PRODUCCIÓN (Render): credenciales en variable de entorno
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(serviceAccount);
    } else {
        // DESARROLLO LOCAL: archivo serviceAccountKey.json
        const serviceAccount = require('./serviceAccountKey.json');
        credential = admin.credential.cert(serviceAccount);
    }

    admin.initializeApp({ credential });
}

// ── Rutas ────────────────────────────────────────────────────
const librosRouter  = require('./routes/libros');
const novelasRouter = require('./routes/novelas');
const adminRouter   = require('./routes/admin');

app.use(cors());
app.use(express.json());

app.use('/api/libros',  librosRouter);
app.use('/api/novelas', novelasRouter);
app.use('/api/admin',   adminRouter);

module.exports = app;
