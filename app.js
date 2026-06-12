const express = require('express');
const cors    = require('cors');
const app     = express();

// ── Firebase Admin SDK ───────────────────────────────────────
let adminInitializado = false;

try {
    const { initializeApp, getApps, cert } = require('firebase-admin/app');

    if (getApps().length === 0) {
        let serviceAccount;

        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('✅ Firebase Admin: usando variable de entorno');
        } else {
            serviceAccount = require('./serviceAccountKey.json');
            console.log('✅ Firebase Admin: usando archivo local');
        }

        initializeApp({ credential: cert(serviceAccount) });
    }

    adminInitializado = true;
    console.log('✅ Firebase Admin inicializado correctamente');
} catch (err) {
    console.error('❌ Firebase Admin error:', err.message);
}

// ── Rutas ────────────────────────────────────────────────────
const librosRouter  = require('./routes/libros');
const novelasRouter = require('./routes/novelas');

app.use(cors());
app.use(express.json());

app.use('/api/libros',  librosRouter);
app.use('/api/novelas', novelasRouter);

if (adminInitializado) {
    const adminRouter = require('./routes/admin');
    app.use('/api/admin', adminRouter);
    console.log('✅ Rutas /api/admin activas');
} else {
    app.use('/api/admin', (req, res) => {
        res.status(503).json({ error: 'Firebase Admin SDK no configurado.' });
    });
}

module.exports = app;
