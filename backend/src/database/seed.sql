INSERT INTO configuracion (
    hora_apertura,
    hora_cierre,
    intervalo_minutos,
    duraciones_habilitadas,
    anticipacion_minima,
    telefono_club,
    logo_url,
    mensaje_confirmacion,
    minutos_minimos_cancelacion_cliente,
    horas_minimas_cancelacion_cliente,
    horas_minimas_reprogramacion_cliente
)
SELECT
    '18:00',
    '23:00',
    30,
    '60,90,120,150,180',
    0,
    '3834000000',
    NULL,
    'Tu reserva fue confirmada correctamente.',
    180,
    3,
    3
WHERE NOT EXISTS (
    SELECT 1 FROM configuracion
);

INSERT INTO canchas (nombre, descripcion, hora_apertura, hora_cierre, activa)
SELECT 'Cancha 1', 'Cancha principal', '18:00', '23:00', TRUE
WHERE NOT EXISTS (SELECT 1 FROM canchas WHERE nombre = 'Cancha 1');

INSERT INTO canchas (nombre, descripcion, hora_apertura, hora_cierre, activa)
SELECT 'Cancha 2', 'Cancha secundaria', '18:00', '23:00', TRUE
WHERE NOT EXISTS (SELECT 1 FROM canchas WHERE nombre = 'Cancha 2');

INSERT INTO tarifas (cancha_id, duracion_minutos, precio_base, adicional_luz, activa)
SELECT NULL, 60, 12000, 3000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM tarifas WHERE cancha_id IS NULL AND duracion_minutos = 60);

INSERT INTO tarifas (cancha_id, duracion_minutos, precio_base, adicional_luz, activa)
SELECT NULL, 90, 18000, 4000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM tarifas WHERE cancha_id IS NULL AND duracion_minutos = 90);

INSERT INTO tarifas (cancha_id, duracion_minutos, precio_base, adicional_luz, activa)
SELECT NULL, 120, 24000, 5000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM tarifas WHERE cancha_id IS NULL AND duracion_minutos = 120);

INSERT INTO tarifas (cancha_id, duracion_minutos, precio_base, adicional_luz, activa)
SELECT NULL, 150, 30000, 6000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM tarifas WHERE cancha_id IS NULL AND duracion_minutos = 150);

INSERT INTO tarifas (cancha_id, duracion_minutos, precio_base, adicional_luz, activa)
SELECT NULL, 180, 36000, 7000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM tarifas WHERE cancha_id IS NULL AND duracion_minutos = 180);
