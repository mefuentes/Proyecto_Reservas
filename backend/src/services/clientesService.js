const db = require('../config/db');

function normalizarDocumento(documento = '') {
  return String(documento).replace(/\D/g, '');
}

function normalizarNombreApellido(nombre = '') {
  return String(nombre).trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizarTelefono(telefono = '') {
  const limpio = String(telefono).trim();
  return limpio || null;
}

function getClientePorDocumento(documento) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM clientes WHERE documento = ?`, [normalizarDocumento(documento)], (err, row) => {
      if (err) reject(err); else resolve(row || null);
    });
  });
}

function listarClientes({ q = '', page = 1, pageSize = 10 } = {}) {
  return new Promise((resolve, reject) => {
    const texto = String(q || '').trim();
    const doc = normalizarDocumento(texto);
    const filtros = [];
    const params = [];
    const safePage = Math.max(Number(page) || 1, 1);
    const safePageSize = Math.max(Number(pageSize) || 10, 1);
    const offset = (safePage - 1) * safePageSize;

    if (texto) {
      if (doc) {
        filtros.push(`c.documento LIKE ?`);
        params.push(`%${doc}%`);
      }
      filtros.push(`UPPER(c.nombre_apellido) LIKE ?`);
      params.push(`%${texto.toUpperCase()}%`);
    }

    let fromSql = `
      SELECT c.*, COUNT(r.id) AS cantidad_reservas
      FROM clientes c
      LEFT JOIN reservas r ON r.cliente_id = c.id
    `;
    if (filtros.length) {
      fromSql += ` WHERE (${filtros.join(' OR ')})`;
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM clientes c
      ${filtros.length ? `WHERE (${filtros.join(' OR ')})` : ''}
    `;

    const sql = `${fromSql} GROUP BY c.id ORDER BY c.nombre_apellido ASC LIMIT ? OFFSET ?`;

    db.get(countSql, params, (countErr, countRow) => {
      if (countErr) return reject(countErr);
      db.all(sql, [...params, safePageSize, offset], (err, rows) => {
        if (err) return reject(err);
        resolve({
          rows: rows || [],
          total: Number(countRow?.total || 0),
          page: safePage,
          pageSize: safePageSize
        });
      });
    });
  });
}

function crearCliente({ documento, nombre_apellido, telefono }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = normalizarDocumento(documento);
      const nombre = normalizarNombreApellido(nombre_apellido);
      const tel = normalizarTelefono(telefono);
      if (!doc) throw new Error('Documento invalido');
      if (!nombre) throw new Error('Nombre invalido');

      const existente = await getClientePorDocumento(doc);
      if (existente) throw new Error('Ya existe un cliente con ese documento');

      db.run(`INSERT INTO clientes (documento, nombre_apellido, telefono) VALUES (?, ?, ?)`, [doc, nombre, tel], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, documento: doc, nombre_apellido: nombre, telefono: tel });
      });
    } catch (error) {
      reject(error);
    }
  });
}

function crearOActualizarCliente({ documento, nombre_apellido, telefono }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = normalizarDocumento(documento);
      const nombre = normalizarNombreApellido(nombre_apellido);
      const tel = normalizarTelefono(telefono);
      if (!doc) throw new Error('Documento invalido');
      if (!nombre) throw new Error('Nombre invalido');
      const existente = await getClientePorDocumento(doc);
      if (existente) {
        db.run(`UPDATE clientes SET nombre_apellido = ?, telefono = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nombre, tel, existente.id], function (err) {
          if (err) return reject(err);
          resolve({ ...existente, nombre_apellido: nombre, telefono: tel });
        });
      } else {
        db.run(`INSERT INTO clientes (documento, nombre_apellido, telefono) VALUES (?, ?, ?)`, [doc, nombre, tel], function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, documento: doc, nombre_apellido: nombre, telefono: tel });
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}

function actualizarCliente(id, { nombre_apellido, telefono }) {
  return new Promise((resolve, reject) => {
    const nombre = normalizarNombreApellido(nombre_apellido);
    const tel = normalizarTelefono(telefono);
    db.run(`UPDATE clientes SET nombre_apellido = ?, telefono = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [nombre, tel, id], function (err) {
      if (err) reject(err); else resolve(this.changes > 0);
    });
  });
}

function eliminarCliente(id) {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE reservas SET cliente_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE cliente_id = ?`, [id], function (updateErr) {
      if (updateErr) return reject(updateErr);
      db.run(`DELETE FROM clientes WHERE id = ?`, [id], function (deleteErr) {
        if (deleteErr) return reject(deleteErr);
        resolve(this.changes > 0);
      });
    });
  });
}

module.exports = {
  normalizarDocumento,
  normalizarNombreApellido,
  normalizarTelefono,
  getClientePorDocumento,
  listarClientes,
  crearCliente,
  crearOActualizarCliente,
  actualizarCliente,
  eliminarCliente
};
