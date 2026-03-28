const bcrypt = require('bcrypt');
const db = require('../config/db');
const { dbBoolean } = require('../utils/dbHelpers');

const ROLES_VALIDOS = ['gerencial', 'empleado'];

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase();
}

function normalizarNombre(valor) {
  return String(valor || '').trim();
}

function normalizarRol(valor) {
  const rol = String(valor || '').trim().toLowerCase();
  if (rol === 'admin' || rol === 'gerente') return 'gerencial';
  return rol;
}

function obtenerPrioridadRol(rol) {
  if (rol === 'admin' || rol === 'gerente' || rol === 'gerencial') return 1;
  return 2;
}

async function listarUsuariosAdmin(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.max(Number(req.query.page_size) || 10, 1);
    const offset = (page - 1) * pageSize;

    let where = '';
    const params = [];

    if (q) {
      where = `WHERE LOWER(nombre) LIKE ? OR LOWER(email) LIKE ? OR LOWER(rol) LIKE ?`;
      const term = `%${q.toLowerCase()}%`;
      params.push(term, term, term);
    }

    const totalRow = await dbGet(`SELECT COUNT(*) AS total FROM usuarios_admin ${where}`, params);
    const data = await dbAll(
      `SELECT id, nombre, email, rol, activo, created_at, updated_at
       FROM usuarios_admin
       ${where}
       ORDER BY nombre ASC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const dataOrdenada = [...data].sort((a, b) => {
      const prioridad = obtenerPrioridadRol(a.rol) - obtenerPrioridadRol(b.rol);
      if (prioridad !== 0) return prioridad;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''));
    });

    return res.json({
      ok: true,
      data: dataOrdenada,
      pagination: {
        total: Number(totalRow?.total || 0),
        page,
        page_size: pageSize,
        total_pages: Math.max(Math.ceil(Number(totalRow?.total || 0) / pageSize), 1)
      }
    });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al obtener los usuarios' });
  }
}

async function crearUsuarioAdmin(req, res) {
  try {
    const nombre = normalizarNombre(req.body?.nombre);
    const email = normalizarEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const rol = normalizarRol(req.body?.rol);

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ ok: false, message: 'Nombre, email, contrasena y rol son obligatorios' });
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ ok: false, message: 'Rol invalido' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: 'La contrasena debe tener al menos 6 caracteres' });
    }

    const existente = await dbGet(`SELECT id FROM usuarios_admin WHERE email = ?`, [email]);
    if (existente) {
      return res.status(409).json({ ok: false, message: 'Ya existe un usuario con ese email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await dbRun(
      `INSERT INTO usuarios_admin (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)`,
      [nombre, email, passwordHash, rol, dbBoolean(true)]
    );

    return res.status(201).json({ ok: true, data: { id: result.lastID } });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al crear el usuario' });
  }
}

async function actualizarUsuarioAdmin(req, res) {
  try {
    const id = Number(req.params.id);
    const nombre = normalizarNombre(req.body?.nombre);
    const email = normalizarEmail(req.body?.email);
    const rol = normalizarRol(req.body?.rol);
    const password = String(req.body?.password || '').trim();

    if (!id || !nombre || !email || !rol) {
      return res.status(400).json({ ok: false, message: 'Nombre, email y rol son obligatorios' });
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ ok: false, message: 'Rol invalido' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ ok: false, message: 'La contrasena debe tener al menos 6 caracteres' });
    }

    const actual = await dbGet(`SELECT id, email, rol FROM usuarios_admin WHERE id = ?`, [id]);
    if (!actual) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const emailEnUso = await dbGet(`SELECT id FROM usuarios_admin WHERE email = ? AND id <> ?`, [email, id]);
    if (emailEnUso) {
      return res.status(409).json({ ok: false, message: 'Ya existe otro usuario con ese email' });
    }

    if (req.admin?.id === id && rol === 'empleado') {
      return res.status(400).json({ ok: false, message: 'No puedes quitarte tu propio acceso gerencial' });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await dbRun(
        `UPDATE usuarios_admin
         SET nombre = ?, email = ?, rol = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nombre, email, rol, passwordHash, id]
      );
    } else {
      await dbRun(
        `UPDATE usuarios_admin
         SET nombre = ?, email = ?, rol = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nombre, email, rol, id]
      );
    }

    return res.json({ ok: true, message: 'Usuario actualizado correctamente' });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al actualizar el usuario' });
  }
}

async function cambiarEstadoUsuarioAdmin(req, res) {
  try {
    const id = Number(req.params.id);
    const activo = dbBoolean(req.body?.activo);

    if (!id) {
      return res.status(400).json({ ok: false, message: 'Usuario invalido' });
    }

    const actual = await dbGet(`SELECT id, rol, activo FROM usuarios_admin WHERE id = ?`, [id]);
    if (!actual) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    if (req.admin?.id === id && !activo) {
      return res.status(400).json({ ok: false, message: 'No puedes desactivar tu propio usuario' });
    }

    await dbRun(`UPDATE usuarios_admin SET activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [activo, id]);
    return res.json({ ok: true, message: activo ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente' });
  } catch {
    return res.status(500).json({ ok: false, message: 'Error al actualizar el estado del usuario' });
  }
}

module.exports = {
  listarUsuariosAdmin,
  crearUsuarioAdmin,
  actualizarUsuarioAdmin,
  cambiarEstadoUsuarioAdmin
};
