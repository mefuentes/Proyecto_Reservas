require('dotenv').config();
const db = require('./src/config/db');
const util = require('util');
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));
const dbRun = util.promisify(db.run.bind(db));

(async () => {
  const dbDriver = (process.env.DB_DRIVER || 'sqlite').trim().toLowerCase();
  const isPostgres = dbDriver === 'postgres' || dbDriver === 'pg';
  console.log('isPostgres', isPostgres, 'dbDriver', dbDriver);

  async function addColumnIfMissing(tableName, columnName, definition) {
    let exists = false;
    if (isPostgres) {
      const row = await dbGet('SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', [tableName, columnName]);
      exists = !!row;
    } else {
      const rows = await dbAll(`PRAGMA table_info(${tableName})`);
      exists = rows.some((r) => r.name === columnName);
    }
    console.log('check', tableName, columnName, 'exists', exists);
    if (!exists) {
      console.log('adding', tableName, columnName, definition);
      await dbRun(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
    return !exists;
  }

  if (!isPostgres) {
    await dbRun('CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, documento TEXT NOT NULL UNIQUE, nombre_apellido TEXT NOT NULL, telefono TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  }

  try {
    await addColumnIfMissing('canchas', 'hora_apertura', "TEXT NOT NULL DEFAULT '18:00'");
    await addColumnIfMissing('canchas', 'hora_cierre', "TEXT NOT NULL DEFAULT '23:00'");
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
    await addColumnIfMissing('bloqueos_horarios', 'tipo', "TEXT NOT NULL DEFAULT 'fecha'");
    await addColumnIfMissing('bloqueos_horarios', 'dia_semana', 'INTEGER');
    await addColumnIfMissing('bloqueos_horarios', 'fecha_desde', 'TEXT');
    await addColumnIfMissing('bloqueos_horarios', 'fecha_hasta', 'TEXT');
    await addColumnIfMissing('bloqueos_horarios', 'activo', bloqueosActivoDef);

    const reservasInfo = await new Promise((resolve, reject) => {
      db.all("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'reservas'", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log('reservasInfo', reservasInfo.map(r => ({ name: r.column_name, notnull: r.is_nullable })).slice(0, 20));

    if (horasCancelacionAgregada) {
      await dbRun("UPDATE configuracion SET horas_minimas_cancelacion_cliente = CASE WHEN COALESCE(minutos_minimos_cancelacion_cliente, 0) <= 0 THEN 0 ELSE CAST((minutos_minimos_cancelacion_cliente + 59) / 60 AS INTEGER) END");
    }
    if (horasReprogramacionAgregada) {
      await dbRun('UPDATE configuracion SET horas_minimas_reprogramacion_cliente = horas_minimas_cancelacion_cliente');
    }

    console.log('migrate done');
  } catch (e) {
    console.error('migrate error', e);
    process.exit(1);
  }

  try {
    const seed = require('fs').readFileSync(require('path').join(__dirname,'src','database','seed.sql'),'utf8');
    await dbRun(seed);
    console.log('seed done');
  } catch (e) {
    console.error('seed error', e);
    process.exit(1);
  }

  console.log('All done');
  process.exit(0);
})();
