import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { obtenerConfiguracion } from '../services/api';
import { formatCurrency } from '../utils/currency';

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

async function generarComprobanteBlob({ logoUrl, canchaNombre, reserva }) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#eef4ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 280);
  gradient.addColorStop(0, '#17337a');
  gradient.addColorStop(1, '#2563eb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, 250);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 50px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Comprobante de Reserva', canvas.width / 2, 88);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '26px Arial';
  ctx.fillText('Club de Padel', canvas.width / 2, 132);

  roundedRect(ctx, 66, 172, canvas.width - 132, 980, 38);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  let top = 228;
  try {
    const logo = await loadImage(logoUrl);
    if (logo) {
      const maxSize = 170;
      const ratio = Math.min(maxSize / logo.width, maxSize / logo.height);
      const width = logo.width * ratio;
      const height = logo.height * ratio;
      ctx.drawImage(logo, canvas.width / 2 - width / 2, top, width, height);
      top += height + 34;
    }
  } catch {}

  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, top + 28, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 30px Arial';
  ctx.fillText('OK', canvas.width / 2, top + 38);
  top += 86;

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 42px Arial';
  ctx.fillText('Reserva confirmada', canvas.width / 2, top);
  top += 18;

  const rows = [
    ['Cancha', canchaNombre],
    ['Fecha', reserva.fecha],
    ['Horario', `${reserva.hora_inicio} a ${reserva.hora_fin}`],
    ['Duracion', `${reserva.duracion_minutos} minutos`],
    ['Modalidad', reserva.con_luz ? 'Con luz' : 'Sin luz'],
    ['Total', formatCurrency(reserva.precio_total)],
    ['Nombre', reserva.nombre_cliente]
  ];

  const startX = 126;
  const contentWidth = canvas.width - startX * 2;
  const rowHeight = 86;

  rows.forEach(([label, value], index) => {
    const y = top + index * rowHeight;
    if (index > 0) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, y - 34);
      ctx.lineTo(startX + contentWidth, y - 34);
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '700 24px Arial';
    ctx.fillText(label, startX, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 28px Arial';
    ctx.fillText(String(value), startX + contentWidth, y);
  });

  const footerY = top + rows.length * rowHeight + 20;
  roundedRect(ctx, 104, footerY, canvas.width - 208, 118, 26);
  ctx.fillStyle = '#eff6ff';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1d4ed8';
  ctx.font = '700 24px Arial';
  ctx.fillText('Gracias por elegirnos', canvas.width / 2, footerY + 48);
  ctx.fillStyle = '#475569';
  ctx.font = '22px Arial';
  ctx.fillText('Si necesitas cambios, gestionarlos solo antes del horario del turno.', canvas.width / 2, footerY + 84);

  return canvasToBlob(canvas);
}

function abrirWhatsappWeb(texto) {
  const webUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

function puedeUsarCompartirNativo() {
  if (!navigator.share || !navigator.canShare) return false;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

async function copiarImagenAlPortapapeles(blob) {
  if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') return false;
  try {
    await navigator.clipboard.write([
      new window.ClipboardItem({
        'image/png': blob
      })
    ]);
    return true;
  } catch {
    return false;
  }
}

export default function ConfirmacionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reserva = location.state?.reserva;
  const canchaNombre = location.state?.canchaNombre;
  const [logoUrl, setLogoUrl] = useState('');
  const [shareInfo, setShareInfo] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const resp = await obtenerConfiguracion();
        if (resp.ok && resp.data?.logo_url) setLogoUrl(resp.data.logo_url);
      } catch {}
    }
    cargarConfiguracion();
  }, []);

  const nombreArchivo = useMemo(() => {
    if (!reserva) return 'comprobante-reserva.png';
    return `comprobante-${reserva.fecha}-${reserva.hora_inicio.replace(':', '-')}.png`;
  }, [reserva]);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    async function prepararVistaPrevia() {
      if (!reserva) return;
      try {
        const blob = await generarComprobanteBlob({ logoUrl, canchaNombre, reserva });
        if (!blob || !active) return;
        objectUrl = URL.createObjectURL(blob);
        setReceiptPreviewUrl(objectUrl);
      } catch {
        if (active) setReceiptPreviewUrl('');
      }
    }

    prepararVistaPrevia();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [canchaNombre, logoUrl, reserva]);

  async function handleCompartirWhatsapp() {
    setShareInfo('');
    setIsSharing(true);
    try {
      const blob = await generarComprobanteBlob({ logoUrl, canchaNombre, reserva });
      if (!blob) throw new Error();

      const file = new File([blob], nombreArchivo, { type: 'image/png' });
      if (puedeUsarCompartirNativo() && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Comprobante de reserva',
          text: 'Te comparto mi comprobante de reserva.',
          files: [file]
        });
        return;
      }

      const copied = await copiarImagenAlPortapapeles(blob);
      abrirWhatsappWeb('Te comparto mi comprobante de reserva.');
      if (copied) {
        setShareInfo('El comprobante se copio como imagen al portapapeles y se abrio WhatsApp Web. Pegalo en el chat seleccionado con Ctrl+V.');
      } else {
        setShareInfo('Se abrio WhatsApp Web, pero tu navegador no permitio copiar la imagen al portapapeles. En escritorio no es posible adjuntarla automaticamente desde el navegador.');
      }
    } catch {
      setShareInfo('No se pudo generar el comprobante en imagen para compartir.');
    } finally {
      setIsSharing(false);
    }
  }

  if (!reserva) return <Navigate to="/reservas" replace />;

  return (
    <div>
      <Header />
      <main className="container">
        <section className="card confirmation-card center">
          <h2>Reserva confirmada</h2>
          <p>Tu turno fue registrado correctamente.</p>
          <div className="receipt-preview-shell">
            {receiptPreviewUrl ? (
              <img className="receipt-preview-image" src={receiptPreviewUrl} alt="Comprobante de reserva" />
            ) : (
              <div className="summary-panel summary-panel-confirmation">
                <div className="summary-row"><span>Cancha</span><strong>{canchaNombre}</strong></div>
                <div className="summary-row"><span>Fecha</span><strong>{reserva.fecha}</strong></div>
                <div className="summary-row"><span>Horario</span><strong>{reserva.hora_inicio} a {reserva.hora_fin}</strong></div>
                <div className="summary-row"><span>Duracion</span><strong>{reserva.duracion_minutos} minutos</strong></div>
                <div className="summary-row"><span>Modalidad</span><strong>{reserva.con_luz ? 'Con luz' : 'Sin luz'}</strong></div>
                <div className="summary-row"><span>Total</span><strong>{formatCurrency(reserva.precio_total)}</strong></div>
                <div className="summary-row"><span>Nombre</span><strong>{reserva.nombre_cliente}</strong></div>
              </div>
            )}
          </div>
          <div className="hero-actions confirmation-actions">
            <button type="button" className="success-btn share-btn whatsapp-share-btn" onClick={handleCompartirWhatsapp} disabled={isSharing}>
              {isSharing ? 'Generando imagen...' : 'Compartir por WhatsApp'}
            </button>
            <button type="button" className="secondary-btn share-btn exit-btn" onClick={() => navigate('/', { replace: true })}>Salir</button>
          </div>
          {shareInfo ? <div className="info-box mt-16">{shareInfo}</div> : null}
        </section>
      </main>
    </div>
  );
}
