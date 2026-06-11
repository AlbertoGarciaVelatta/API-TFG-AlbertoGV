const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');

// ─────────────────────────────────────────────────────────────
// REQUISITO: Firebase Admin SDK inicializado en app.js
//
// En app.js añade esto UNA VEZ antes de las rutas:
//
//   const admin = require('firebase-admin');
//   const serviceAccount = require('./serviceAccountKey.json');
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
//   });
//
// El archivo serviceAccountKey.json se descarga desde:
// Firebase Console → Configuración del proyecto
//   → Cuentas de servicio → Generar nueva clave privada
//
// ⚠️  Añade serviceAccountKey.json a .gitignore — nunca lo subas
// ─────────────────────────────────────────────────────────────

// ── GET /api/admin/usuarios — lista todos los usuarios ───────
router.get('/usuarios', async (req, res) => {
    try {
        const resultado = await admin.auth().listUsers(1000);
        const usuarios  = resultado.users.map(u => ({
            uid:   u.uid,
            email: u.email || '',
            role:  u.customClaims?.role || 'usuario'
        }));
        res.json(usuarios);
    } catch (err) {
        console.error('Error listando usuarios:', err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// ── DELETE /api/admin/usuarios/:uid — eliminar usuario ───────
router.delete('/usuarios/:uid', async (req, res) => {
    try {
        await admin.auth().deleteUser(req.params.uid);
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

// ── POST /api/admin/crear-trabajador ─────────────────────────
// Crea un usuario en Firebase y le asigna role=trabajador
// Body: { email, password }
router.post('/crear-trabajador', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña obligatorios' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        // 1. Crear la cuenta en Firebase Auth
        const nuevoUsuario = await admin.auth().createUser({ email, password });

        // 2. Asignar el Custom Claim de rol trabajador
        //    Este claim estará disponible en el token JWT del usuario
        //    y podrá verificarse en el middleware de roles
        await admin.auth().setCustomUserClaims(nuevoUsuario.uid, { role: 'trabajador' });

        res.status(201).json({
            mensaje: 'Cuenta de trabajador creada correctamente',
            uid:     nuevoUsuario.uid,
            email:   nuevoUsuario.email
        });
    } catch (err) {
        console.error('Error creando trabajador:', err);
        // Firebase devuelve códigos de error descriptivos
        if (err.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
        }
        res.status(500).json({ error: 'Error al crear la cuenta' });
    }
});

// ── POST /api/admin/asignar-rol ──────────────────────────────
// Cambia el rol de un usuario existente
// Body: { uid, role }  — role: 'usuario' | 'trabajador' | 'admin'
router.post('/asignar-rol', async (req, res) => {
    const { uid, role } = req.body;
    const rolesValidos  = ['usuario', 'trabajador', 'admin'];

    if (!uid || !role || !rolesValidos.includes(role)) {
        return res.status(400).json({ error: 'uid y role válido son obligatorios' });
    }

    try {
        await admin.auth().setCustomUserClaims(uid, { role });
        res.json({ mensaje: `Rol actualizado a '${role}' para el usuario ${uid}` });
    } catch (err) {
        console.error('Error asignando rol:', err);
        res.status(500).json({ error: 'Error al asignar el rol' });
    }
});

module.exports = router;
