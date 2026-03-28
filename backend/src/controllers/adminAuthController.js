const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { activeCondition } = require('../utils/dbHelpers');

const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, message: 'Email y contraseña son obligatorios' });

  db.get(`SELECT * FROM usuarios_admin WHERE email = ? AND activo ${activeCondition(true)}`, [email], async (err, user) => {
    if (err) return res.status(500).json({ ok: false, message: 'Error interno' });
    if (!user) return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });

    let coincide = await bcrypt.compare(password, user.password_hash);

    // Legacy fallback for plaintext password hashes from old migrations
    if (!coincide && user.password_hash === password) {
      coincide = true;
      const hashed = await bcrypt.hash(password, 10);
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE usuarios_admin SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [hashed, user.id],
          (error) => (error ? reject(error) : resolve())
        );
      });
    }

    if (!coincide) return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, process.env.JWT_SECRET || 'secreto_dev', { expiresIn: '8h' });
    return res.json({ ok: true, data: { token, usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } } });
  });
};

module.exports = { login };
