const express = require('express');
const router  = express.Router();
const { getAuth } = require('firebase-admin/auth');

// ── GET /api/admin/usuarios ──────────────────────────────────
router.get('/usuarios', async (req, res) => {
    try {
        const resultado = await getAuth().listUsers(1000);
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

// ── DELETE /api/admin/usuarios/:uid ─────────────────────────
router.delete('/usuarios/:uid', async (req, res) => {
    try {
        await getAuth().deleteUser(req.params.uid);
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (err) {
        console.error('Error eliminando usuario:', err);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

// ── POST /api/admin/crear-trabajador ─────────────────────────
router.post('/crear-trabajador', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña obligatorios' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    try {
        const nuevoUsuario = await getAuth().createUser({ email, password });
        await getAuth().setCustomUserClaims(nuevoUsuario.uid, { role: 'trabajador' });
        res.status(201).json({
            mensaje: 'Cuenta de trabajador creada correctamente',
            uid:     nuevoUsuario.uid,
            email:   nuevoUsuario.email
        });
    } catch (err) {
        console.error('Error creando trabajador:', err);
        if (err.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
        }
        res.status(500).json({ error: 'Error al crear la cuenta' });
    }
});

// ── POST /api/admin/asignar-rol ──────────────────────────────
router.post('/asignar-rol', async (req, res) => {
    const { uid, role } = req.body;
    const rolesValidos  = ['usuario', 'trabajador', 'admin'];

    if (!uid || !role || !rolesValidos.includes(role)) {
        return res.status(400).json({ error: 'uid y role válido son obligatorios' });
    }

    try {
        await getAuth().setCustomUserClaims(uid, { role });
        res.json({ mensaje: `Rol '${role}' asignado correctamente` });
    } catch (err) {
        console.error('Error asignando rol:', err);
        res.status(500).json({ error: 'Error al asignar el rol' });
    }
});

module.exports = router;
