PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS canchas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    hora_apertura TEXT NOT NULL DEFAULT '18:00',
    hora_cierre TEXT NOT NULL DEFAULT '23:00',
    activa INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento TEXT NOT NULL UNIQUE,
    nombre_apellido TEXT NOT NULL,
    telefono TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha_id INTEGER NOT NULL,
    cliente_id INTEGER,
    documento_cliente TEXT,
    fecha TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    duracion_minutos INTEGER NOT NULL,
    nombre_cliente TEXT NOT NULL,
    telefono_cliente TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'confirmada',
    origen TEXT NOT NULL DEFAULT 'web',
    observaciones TEXT,
    con_luz INTEGER NOT NULL DEFAULT 0,
    precio_base_aplicado REAL NOT NULL DEFAULT 0,
    adicional_luz_aplicado REAL NOT NULL DEFAULT 0,
    precio_total REAL NOT NULL DEFAULT 0,
    reserva_original_id INTEGER,
    motivo_cambio TEXT,
    cancelado_por_tipo TEXT,
    cancelado_por_nombre TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cancha_id) REFERENCES canchas(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (reserva_original_id) REFERENCES reservas(id)
);

CREATE TABLE IF NOT EXISTS bloqueos_horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha_id INTEGER,
    grupo_bloqueo TEXT,
    cliente_id INTEGER,
    documento_cliente TEXT,
    fecha TEXT,
    tipo TEXT NOT NULL DEFAULT 'fecha',
    dia_semana TEXT,
    fecha_desde TEXT,
    fecha_hasta TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    motivo TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cancha_id) REFERENCES canchas(id)
);

CREATE TABLE IF NOT EXISTS usuarios_admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'admin',
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hora_apertura TEXT NOT NULL,
    hora_cierre TEXT NOT NULL,
    intervalo_minutos INTEGER NOT NULL DEFAULT 30,
    duraciones_habilitadas TEXT NOT NULL,
    anticipacion_minima INTEGER NOT NULL DEFAULT 0,
    telefono_club TEXT,
    logo_url TEXT,
    mensaje_confirmacion TEXT,
    minutos_minimos_cancelacion_cliente INTEGER NOT NULL DEFAULT 180,
    horas_minimas_cancelacion_cliente INTEGER NOT NULL DEFAULT 3,
    horas_minimas_reprogramacion_cliente INTEGER NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tarifas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cancha_id INTEGER,
    duracion_minutos INTEGER NOT NULL,
    precio_base REAL NOT NULL,
    adicional_luz REAL NOT NULL DEFAULT 0,
    activa INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cancha_id) REFERENCES canchas(id)
);

CREATE TABLE IF NOT EXISTS whatsapp_contactos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefono TEXT NOT NULL UNIQUE,
    nombre TEXT,
    ultimo_mensaje_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefono TEXT NOT NULL,
    direccion TEXT NOT NULL,
    tipo TEXT NOT NULL,
    mensaje TEXT,
    estado TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservas_cancha_fecha ON reservas (cancha_id, fecha);
CREATE INDEX IF NOT EXISTS idx_bloqueos_cancha_fecha ON bloqueos_horarios (cancha_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_telefono_fecha ON reservas (telefono_cliente, fecha);

CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes (documento);
CREATE INDEX IF NOT EXISTS idx_reservas_documento_fecha ON reservas (documento_cliente, fecha);
