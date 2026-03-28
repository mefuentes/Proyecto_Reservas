import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerConfiguracion } from '../services/api';

export default function Header() {
  const [logoUrl, setLogoUrl] = useState('');
  const [logoVisible, setLogoVisible] = useState(true);

  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const resp = await obtenerConfiguracion();
        if (resp.ok && resp.data?.logo_url) {
          setLogoUrl(resp.data.logo_url);
          setLogoVisible(true);
        }
      } catch {}
    }

    cargarConfiguracion();
  }, []);

  return (
    <header className="app-header">
      <div className="container header-content">
        <div className="header-copy">
          <h1>Club de Padel</h1>
          <p>Reserva online simple y rapida.</p>
        </div>
        <div className="header-logo-center">
          {logoUrl && logoVisible ? (
            <img
              className="club-logo featured"
              src={logoUrl}
              alt="Logo del club"
              onError={() => setLogoVisible(false)}
            />
          ) : (
            <div className="club-logo-placeholder" aria-hidden="true" />
          )}
        </div>
        <nav className="header-actions">
          <Link to="/reservas" className="header-link primary">RESERVAR</Link>
          <Link to="/mis-reservas" className="header-link secondary">Mis reservas</Link>
        </nav>
      </div>
    </header>
  );
}
