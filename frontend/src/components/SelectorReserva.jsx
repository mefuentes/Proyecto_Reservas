export default function SelectorReserva({ fecha, setFecha, canchaId, setCanchaId, duracion, setDuracion, canchas, duraciones, onBuscar, cargando, fechaMinima }) {
  const puedeBuscar = Boolean(fecha && canchaId && duracion);

  return (
    <section className="card">
      <div className="section-header">
        <span className="section-badge">Paso 1</span>
        <h2>Elegi fecha, cancha y duracion</h2>
        <p>Selecciona los datos basicos para consultar los turnos disponibles.</p>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="fecha">Fecha</label>
          <input id="fecha" type="date" min={fechaMinima} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="cancha">Cancha</label>
          <select id="cancha" value={canchaId} onChange={(e) => setCanchaId(e.target.value)}>
            <option value="">Seleccionar cancha</option>
            {canchas.map((cancha) => <option key={cancha.id} value={cancha.id}>{cancha.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="duracion">Duracion</label>
          <select id="duracion" value={duracion} onChange={(e) => setDuracion(e.target.value)}>
            <option value="">Seleccionar duracion</option>
            {duraciones.map((d) => <option key={d} value={d}>{d} minutos</option>)}
          </select>
        </div>
      </div>
      <button className="primary-btn" onClick={onBuscar} disabled={cargando || !puedeBuscar}>
        {cargando ? 'Consultando disponibilidad...' : 'Ver horarios disponibles'}
      </button>
    </section>
  );
}
