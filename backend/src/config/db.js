const path = require('path');

// Usar SQLite por defecto localmente, PostgreSQL sólo si se configura con DB_DRIVER=postgres o DB_DRIVER=pg
const driver = (process.env.DB_DRIVER || 'sqlite').trim().toLowerCase();

if (driver === 'postgres' || driver === 'pg') {
  const { Pool } = require('pg');
  const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});
  function formatSql(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  const db = {
    get(sql, params, callback) {
      pool.query(formatSql(sql), params || [])
        .then((res) => callback(null, res.rows[0] || undefined))
        .catch((err) => callback(err));
    },
    all(sql, params, callback) {
      pool.query(formatSql(sql), params || [])
        .then((res) => callback(null, res.rows || []))
        .catch((err) => callback(err));
    },
    run(sql, params, callback) {
      pool.query(formatSql(sql), params || [])
        .then((res) => {
          const result = {
            lastID: res.rows && res.rows[0] && (res.rows[0].id || res.rows[0].last_value) ? (res.rows[0].id || res.rows[0].last_value) : null,
            changes: res.rowCount,
            row: res.rows && res.rows[0] ? res.rows[0] : null,
          };
          if (typeof callback === 'function') callback(null, result);
        })
        .catch((err) => callback(err));
    },
    exec(sql, callback) {
      pool.query(sql)
        .then(() => callback(null))
        .catch((err) => callback(err));
    },
    close(callback) {
      pool.end().then(() => callback && callback(null)).catch((err) => callback && callback(err));
    },
  };

  console.log('Conectado a PostgreSQL:', pool.options.host, pool.options.database);
  module.exports = db;
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || 'db.sqlite');

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al conectar con SQLite:', err.message);
    } else {
      console.log('Conectado a SQLite en', dbPath);
    }
  });

  module.exports = db;
}
