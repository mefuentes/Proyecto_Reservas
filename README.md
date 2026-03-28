# Club Pádel Reservas

Proyecto listo para abrir en Visual Studio Code y ejecutar localmente.

## Funcionalidades principales
- Reserva pública por fecha, cancha, duración y horario.
- Cálculo de precio con modalidad **con luz / sin luz**.
- Consulta, cancelación y reprogramación de reservas por cliente.
- Política de cancelación configurable desde el panel admin.
- Panel administrador con agenda, canchas, tarifas, bloqueos, reportes y configuración.
- Integración técnica con WhatsApp (Twilio opcional).

## Requisitos
- Node.js 18 o superior
- npm

## Configuración inicial
### Backend
1. Entrá en `backend`
2. Copiá `.env.example` a `.env`
3. Ejecutá:
   ```bash
   npm install
   npm run dev
   ```

### Frontend
1. Entrá en `frontend`
2. Copiá `.env.example` a `.env`
3. Ejecutá:
   ```bash
   npm install
   npm run dev
   ```

## URLs
- Frontend: `http://localhost:5173`
- Login admin: `http://localhost:5173/admin/login`
- Backend: `http://localhost:3000`

## Admin inicial
Se crea automáticamente al iniciar el backend por primera vez.
- Email: `admin@clubpadel.com`
- Contraseña: `admin123`

## Base de datos
Por defecto ahora se usa PostgreSQL en lugar de SQLite.

- Conexión PostgreSQL: `DB_DRIVER=postgres`
- Host: `PGHOST` (por defecto `localhost`)
- Puerto: `PGPORT` (por defecto `5432`)
- Base: `PGDATABASE` (por defecto `clubdb`)
- Usuario: `PGUSER` (por defecto `clubuser`)
- Password: `PGPASSWORD` (por defecto `changeme`)

### Flujo para usar PostgreSQL desde cero
1. Crea rol y DB en PostgreSQL:
   ```sql
   CREATE ROLE clubuser WITH LOGIN PASSWORD 'changeme';
   CREATE DATABASE clubdb OWNER clubuser;
   ```
2. Copia `.env.example` a `.env` y ajusta variables si es necesario.
3. `cd backend && npm install && npm run dev`.
4. Verificá log: `Conectado a PostgreSQL: ...`.

### Migrar datos de SQLite a PostgreSQL (opcional)
- Exportá SQLite:
  - `sqlite3 backend/db.sqlite .dump > /tmp/sqlite_dump.sql`
- Convertí tipos y claves si necesitás, o usá `pgloader`:
  - `pgloader sqlite:///path/to/backend/db.sqlite postgresql://clubuser:changeme@localhost/clubdb`
- O importá manualmente al SQL generado:
  - `psql -h localhost -U clubuser -d clubdb -f /tmp/sqlite_dump.sql`

- Asegurate de borrar/ignorar `backend/db.sqlite` (ya no se usa).

## WhatsApp
Para usar WhatsApp con Twilio:
- completá `TWILIO_ACCOUNT_SID`
- completá `TWILIO_AUTH_TOKEN`
- dejá `WHATSAPP_PROVIDER=twilio`

Si no vas a usar WhatsApp todavía, dejá:
```env
WHATSAPP_PROVIDER=none
```

## Notas
- El sistema ejecuta migraciones simples al iniciar, para agregar nuevas columnas si la base ya existía.
- La confirmación/cancelación/reprogramación por WhatsApp envía mensajes solo si el teléfono está en formato `+549...` y Twilio está configurado.


## Fase 2 incluida

- Clientes identificados por documento
- Autocompletado al reservar
- Mis reservas por documento y fecha
- Módulo admin Clientes
- Reprogramación usando el mismo margen de cancelación y disponibilidad real


## Notas de operación

- **Anticipación mínima**: se aplica solo a las reservas realizadas por clientes desde la web pública. El administrador puede seguir cargando reservas manuales sin esa restricción.
- **Teléfono**: es opcional para el cliente. Si existe un cliente por documento, el sistema autocompleta nombre y teléfono.
