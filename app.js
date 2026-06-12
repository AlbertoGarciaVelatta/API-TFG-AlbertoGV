const express = require('express');
const cors    = require('cors');
const app     = express();

// ── Firebase Admin SDK ───────────────────────────────────────
let adminInitializado = false;

try {
    const firebaseAdmin = require('firebase-admin');

    if (!firebaseAdmin.apps || firebaseAdmin.apps.length === 0) {
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // PRODUCCIÓN: credenciales en variable de entorno de Render
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            credential = firebaseAdmin.credential.cert(serviceAccount);
            console.log('✅ Firebase Admin: usando variable de entorno');
        } else {
            // DESARROLLO LOCAL: archivo serviceAccountKey.json
            const serviceAccount = require('./serviceAccountKey.json');
            credential = firebaseAdmin.credential.cert(serviceAccount);
            console.log('✅ Firebase Admin: usando serviceAccountKey.json local');
        }

        firebaseAdmin.initializeApp({ credential });
    }

    adminInitializado = true;
} catch (err) {
    console.error('⚠️  Firebase Admin no disponible:', err.message);
    console.error('   Las rutas /api/admin no funcionarán hasta configurarlo.');
}

// ── Rutas ────────────────────────────────────────────────────
const librosRouter  = require('./routes/libros');
const novelasRouter = require('./routes/novelas');

app.use(cors());
app.use(express.json());

app.use('/api/libros',  librosRouter);
app.use('/api/novelas', novelasRouter);

// Solo montamos las rutas de admin si Firebase está disponible
if (adminInitializado) {
    const adminRouter = require('./routes/admin');
    app.use('/api/admin', adminRouter);
    console.log('✅ Rutas /api/admin activas');
} else {
    // Devolvemos un error claro en lugar de "Cannot GET"
    app.use('/api/admin', (req, res) => {
        res.status(503).json({
            error: 'Firebase Admin SDK no configurado en el servidor.',
            solucion: 'Añade la variable de entorno FIREBASE_SERVICE_ACCOUNT en Render.'
        });
    });
}

module.exports = app;
