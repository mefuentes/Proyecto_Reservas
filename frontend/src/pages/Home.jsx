import { Link } from 'react-router-dom';
import Header from '../components/Header';

export default function Home() {
  return (
    <div>
      <Header />
      <main className="container">
        <section className="hero card hero-card">
          <span className="section-badge">Reservas online</span>
          <h2>Tu turno en pocos pasos</h2>
          <p>Consultá disponibilidad en tiempo real, elegí la cancha que prefieras y confirmá tu reserva de manera simple.</p>
          <div className="hero-actions"><Link to="/reservas" className="link-button">Reservar ahora</Link></div>
        </section>
        <section className="features-grid">
          <article className="card feature-card"><h3>Disponibilidad real</h3><p>Mostramos solamente los horarios realmente libres.</p></article>
          <article className="card feature-card"><h3>Múltiples canchas</h3><p>La plataforma se adapta a clubes con cualquier cantidad de canchas.</p></article>
          <article className="card feature-card"><h3>Reserva inmediata</h3><p>Seleccionás fecha, duración y horario, y confirmás en el momento.</p></article>
        </section>
      </main>
    </div>
  );
}
