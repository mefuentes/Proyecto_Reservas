export default function ResumenReserva({ documento, setDocumento, nombre, setNombre, telefono, setTelefono, fecha, canchaNombre, duracion, horarioSeleccionado, horaFinSeleccionada, onConfirmar, cargando, formularioValido, extraResumen = null, extraActions = null, bloqueadoNombre = false }) {
  return (
    <section className="card">
      <div className="section-header">
        <span className="section-badge">Paso 3</span>
        <h2>Confirmar reserva</h2>
        <p>Revisa el resumen y completa tus datos.</p>
      </div>

      {extraActions}

      <div className="summary-panel">
        <div className="summary-row"><span>Fecha</span><strong>{fecha}</strong></div>
        <div className="summary-row"><span>Cancha</span><strong>{canchaNombre}</strong></div>
        <div className="summary-row"><span>Horario</span><strong>{horarioSeleccionado} a {horaFinSeleccionada}</strong></div>
        <div className="summary-row"><span>Duracion</span><strong>{duracion} minutos</strong></div>
        {extraResumen}
      </div>

      <div className="form-grid two-cols">
        <div className="form-group">
          <label htmlFor="documento">Numero de documento</label>
          <input id="documento" type="text" value={documento} onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 30123456" maxLength={15} />
        </div>
        <div className="form-group">
          <label htmlFor="telefono">Telefono</label>
          <input id="telefono" type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: +5493834123456" maxLength={20} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="nombre">Nombre y apellido</label>
        <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value.toUpperCase())} placeholder="Ej: MARIANO FUENTES" maxLength={80} disabled={bloqueadoNombre} />
      </div>

      <button className="success-btn" onClick={onConfirmar} disabled={cargando || !formularioValido}>{cargando ? 'Confirmando reserva...' : 'Confirmar reserva'}</button>
    </section>
  );
}
