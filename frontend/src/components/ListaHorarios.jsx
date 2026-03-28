export default function ListaHorarios({ horarios, horarioSeleccionado, setHorarioSeleccionado, busquedaRealizada, cargando }) {
  return (
    <section className="card">
      <div className="section-header">
        <span className="section-badge">Paso 2</span>
        <h2>Horarios disponibles</h2>
        <p>Elegi el horario que mejor te convenga.</p>
      </div>
      {cargando ? (
        <div className="empty-state"><p>Buscando horarios disponibles...</p></div>
      ) : horarios.length > 0 ? (
        <div className="horarios-grid">
          {horarios.map((horario) => {
            const activo = horarioSeleccionado === horario.hora_inicio;
            return (
              <button key={horario.hora_inicio} type="button" className={activo ? 'horario-btn activo' : 'horario-btn'} onClick={() => setHorarioSeleccionado(horario.hora_inicio)}>
                <span className="horario-inicio">{horario.hora_inicio}</span>
                <span className="horario-fin">a {horario.hora_fin}</span>
              </button>
            );
          })}
        </div>
      ) : busquedaRealizada ? (
        <div className="empty-state"><h3>Sin disponibilidad</h3><p>No hay horarios libres para la combinacion seleccionada.</p></div>
      ) : (
        <div className="empty-state"><p>Completa los datos y consulta disponibilidad para ver los horarios.</p></div>
      )}
    </section>
  );
}
