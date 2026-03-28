const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db');

function ejecutarSqlArchivo(absolutePath) {
  return new Promise((resolve, reject) => {
    const sql = fs.readFileSync(absolutePath, 'utf8');
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function addColumnIfMissing(tableName, columnName, definition) {
  const dbDriver = (process.env.DB_DRIVER || 'sqlite').trim().toLowerCase();
  const isPostgres = dbDriver === 'postgres' || dbDriver === 'pg';

  let exists = false;

  if (isPostgres) {
    const row = await dbGet(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    );
    exists = !!row;
  } else {
    const rows = await new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(${tableName})`, [], (err, data) => {
        if (err) reject(err);
        else resolve(data || []);
      });
    });
    exists = rows.some((row) => row.name === columnName);
  }

  if (!exists) {
    await dbRun(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
  return !exists;
}

async function aplicarMigraciones() {
  const dbDriver = (process.env.DB_DRIVER || 'sqlite').trim().toLowerCase();
  const isPostgres = dbDriver === 'postgres' || dbDriver === 'pg';

  if (!isPostgres) {
    await dbRun(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, documento TEXT NOT NULL UNIQUE, nombre_apellido TEXT NOT NULL, telefono TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  }

  await addColumnIfMissing('canchas', 'hora_apertura', `TEXT NOT NULL DEFAULT '18:00'`);
  await addColumnIfMissing('canchas', 'hora_cierre', `TEXT NOT NULL DEFAULT '23:00'`);
  await addColumnIfMissing('configuracion', 'minutos_minimos_cancelacion_cliente', 'INTEGER NOT NULL DEFAULT 180');
  const horasCancelacionAgregada = await addColumnIfMissing('configuracion', 'horas_minimas_cancelacion_cliente', 'INTEGER NOT NULL DEFAULT 3');
  const horasReprogramacionAgregada = await addColumnIfMissing('configuracion', 'horas_minimas_reprogramacion_cliente', 'INTEGER NOT NULL DEFAULT 3');
  await addColumnIfMissing('configuracion', 'logo_url', 'TEXT');

  const reservasConLuzDef = isPostgres ? 'BOOLEAN NOT NULL DEFAULT FALSE' : 'INTEGER NOT NULL DEFAULT 0';
  const reservasPrecioDef = isPostgres ? 'NUMERIC(12,2) NOT NULL DEFAULT 0' : 'REAL NOT NULL DEFAULT 0';
  const bloqueosActivoDef = isPostgres ? 'BOOLEAN NOT NULL DEFAULT TRUE' : 'INTEGER NOT NULL DEFAULT 1';

  await addColumnIfMissing('reservas', 'con_luz', reservasConLuzDef);
  await addColumnIfMissing('reservas', 'precio_base_aplicado', reservasPrecioDef);
  await addColumnIfMissing('reservas', 'adicional_luz_aplicado', reservasPrecioDef);
  await addColumnIfMissing('reservas', 'precio_total', reservasPrecioDef);
  await addColumnIfMissing('reservas', 'reserva_original_id', 'INTEGER');
  await addColumnIfMissing('reservas', 'motivo_cambio', 'TEXT');
  await addColumnIfMissing('reservas', 'cancelado_por_tipo', 'TEXT');
  await addColumnIfMissing('reservas', 'cancelado_por_nombre', 'TEXT');
  await addColumnIfMissing('reservas', 'cliente_id', 'INTEGER');
  await addColumnIfMissing('reservas', 'documento_cliente', 'TEXT');
  await addColumnIfMissing('bloqueos_horarios', 'grupo_bloqueo', 'TEXT');
  await addColumnIfMissing('bloqueos_horarios', 'tipo', `TEXT NOT NULL DEFAULT 'fecha'`);
  await addColumnIfMissing('bloqueos_horarios', 'dia_semana', 'INTEGER');
  await addColumnIfMissing('bloqueos_horarios', 'fecha_desde', 'TEXT');
  await addColumnIfMissing('bloqueos_horarios', 'fecha_hasta', 'TEXT');
  await addColumnIfMissing('bloqueos_horarios', 'activo', bloqueosActivoDef);

  // ya contamos isPostgres al inicio de aplicarMigraciones
  const reservasInfo = await (async () => {
    if (isPostgres) {
      const rows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1`,
          ['reservas'],
          (err, data) => (err ? reject(err) : resolve(data || []))
        );
      });
      return rows.map((r) => ({ name: r.column_name, notnull: r.is_nullable === 'NO' ? 1 : 0 }));
    }
    return new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(reservas)`, [], (err, data) => (err ? reject(err) : resolve(data || [])));
    });
  })();

  const telefonoCol = reservasInfo.find((c) => c.name === 'telefono_cliente');
  if (telefonoCol && telefonoCol.notnull === 1) {
    // SQLite no soporta alterar NOT NULL fácilmente; no frenamos la app.
    console.warn('Aviso: telefono_cliente sigue NOT NULL en una base previa. Si necesitás teléfono opcional, regenerá db.sqlite o migrá manualmente.');
  }
  if (horasCancelacionAgregada) {
    await dbRun(`
      UPDATE configuracion
      SET horas_minimas_cancelacion_cliente = CASE
        WHEN COALESCE(minutos_minimos_cancelacion_cliente, 0) <= 0 THEN 0
        ELSE CAST((minutos_minimos_cancelacion_cliente + 59) / 60 AS INTEGER)
      END
    `);
  }

  if (horasReprogramacionAgregada) {
    await dbRun(`
      UPDATE configuracion
      SET horas_minimas_reprogramacion_cliente = horas_minimas_cancelacion_cliente
    `);
  }
}

async function asegurarAdminInicial() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@clubpadel.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminNombre = process.env.ADMIN_NAME || 'Administrador';
  const adminRol = process.env.ADMIN_ROLE || 'admin';
  const dbDriver = (process.env.DB_DRIVER || 'sqlite').trim().toLowerCase();
  const isPostgres = dbDriver === 'postgres' || dbDriver === 'pg';

  const existente = await dbGet(`SELECT id, email, password_hash FROM usuarios_admin WHERE email = ?`, [adminEmail]);

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const activoValue = isPostgres ? true : 1;

  if (!existente) {
    await dbRun(`INSERT INTO usuarios_admin (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)`, [adminNombre, adminEmail, passwordHash, adminRol, activoValue]);
    console.log(`Admin inicial creado: ${adminEmail}`);
    return;
  }

  // Si existe admin con contraseña en texto plano, convertimos a hash.
  const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(existente.password_hash);
  if (!isBcryptHash) {
    await dbRun(`UPDATE usuarios_admin SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, existente.id]);
    console.log(`Admin existente migrado a hash seguro: ${adminEmail}`);
  }
}

async function initDb() {
  const basePath = path.join(__dirname, '..', 'database');
  const dbDriver = (process.env.DB_DRIVER || 'postgres').trim().toLowerCase();
  const isPostgres = dbDriver === 'postgres' || dbDriver === 'pg';
  const schemaFile = isPostgres ? 'schema_pg.sql' : 'schema.sql';

  console.log('initDb raw', {cwd: process.cwd(), envDB_DRIVER: process.env.DB_DRIVER, quoted: JSON.stringify(process.env.DB_DRIVER), dbDriver, isPostgres});
  console.log('initDb: DB_DRIVER=', process.env.DB_DRIVER, '=> isPostgres=', isPostgres, '=> schemaFile=', schemaFile);

  await ejecutarSqlArchivo(path.join(basePath, schemaFile));
  await aplicarMigraciones();
  await ejecutarSqlArchivo(path.join(basePath, 'seed.sql'));
  await asegurarAdminInicial();
}

module.exports = initDb;
