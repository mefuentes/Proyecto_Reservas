import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerConfiguracionAdmin, actualizarConfiguracion } from '../services/adminApi';

function parseDuraciones(valor) {
  return String(valor || '')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter(Boolean);
}

function leerArchivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    image.src = src;
  });
}

async function recortarLogoTransparente(dataUrl) {
  const image = await cargarImagen(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo procesar la imagen.');
  }

  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);

  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (right === -1 || bottom === -1) {
    return dataUrl;
  }

  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;
  const outputCanvas = document.createElement('canvas');
  const maxDimension = 900;
  const scale = Math.min(1, maxDimension / Math.max(croppedWidth, croppedHeight));

  outputCanvas.width = Math.max(1, Math.round(croppedWidth * scale));
  outputCanvas.height = Math.max(1, Math.round(croppedHeight * scale));

  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    throw new Error('No se pudo exportar la imagen.');
  }

  outputContext.drawImage(
    canvas,
    left,
    top,
    croppedWidth,
    croppedHeight,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );

  return outputCanvas.toDataURL('image/png');
}

export default function AdminConfiguracion() {
  const [form, setForm] = useState({
    intervalo_minutos: 30,
    duraciones_habilitadas: '60,90,120,150,180',
    anticipacion_minima: 0,
    telefono_club: '',
    logo_url: '',
    mensaje_confirmacion: '',
    horas_minimas_cancelacion_cliente: 3,
    horas_minimas_reprogramacion_cliente: 3
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await obtenerConfiguracionAdmin();
        if (!resp.ok) {
          setError(resp.message || 'No se pudo obtener la configuracion.');
          return;
        }
        if (resp.data) {
          setForm({
            intervalo_minutos: resp.data.intervalo_minutos || 30,
            duraciones_habilitadas: resp.data.duraciones_habilitadas || '60,90,120,150,180',
            anticipacion_minima: resp.data.anticipacion_minima || 0,
            telefono_club: resp.data.telefono_club || '',
            logo_url: resp.data.logo_url || '',
            mensaje_confirmacion: resp.data.mensaje_confirmacion || '',
            horas_minimas_cancelacion_cliente: resp.data.horas_minimas_cancelacion_cliente ?? Math.max(Math.ceil(Number(resp.data.minutos_minimos_cancelacion_cliente || 180) / 60), 0),
            horas_minimas_reprogramacion_cliente: resp.data.horas_minimas_reprogramacion_cliente ?? resp.data.horas_minimas_cancelacion_cliente ?? Math.max(Math.ceil(Number(resp.data.minutos_minimos_cancelacion_cliente || 180) / 60), 0)
          });
        }
      } catch {
        setError('Ocurrio un error al cargar la configuracion.');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEliminarLogo() {
    setForm((prev) => ({ ...prev, logo_url: '' }));
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El logo debe ser un archivo de imagen.');
      e.target.value = '';
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('El logo no puede superar los 2 MB.');
      e.target.value = '';
      return;
    }

    setError('');
    setSubiendoLogo(true);

    try {
      const originalDataUrl = await leerArchivoComoDataUrl(file);
      const trimmedDataUrl = await recortarLogoTransparente(originalDataUrl);
      setForm((prev) => ({ ...prev, logo_url: trimmedDataUrl }));
    } catch {
      setError('No se pudo procesar el archivo del logo.');
    } finally {
      setSubiendoLogo(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (Number(form.intervalo_minutos) <= 0) {
      setError('El intervalo debe ser mayor a 0.');
      return;
    }

    const duraciones = parseDuraciones(form.duraciones_habilitadas);
    if (duraciones.length === 0) {
      setError('Debes ingresar al menos una duracion valida.');
      return;
    }

    const duracionesValidasSistema = [60, 90, 120, 150, 180];
    if (duraciones.some((d) => !duracionesValidasSistema.includes(d))) {
      setError('Las duraciones permitidas son: 60, 90, 120, 150, 180.');
      return;
    }

    if (Number(form.horas_minimas_cancelacion_cliente) < 0 || Number(form.horas_minimas_reprogramacion_cliente) < 0) {
      setError('Los tiempos minimos no pueden ser negativos.');
      return;
    }

    try {
      const resp = await actualizarConfiguracion({
        ...form,
        intervalo_minutos: Number(form.intervalo_minutos),
        anticipacion_minima: Number(form.anticipacion_minima),
        horas_minimas_cancelacion_cliente: Number(form.horas_minimas_cancelacion_cliente),
        horas_minimas_reprogramacion_cliente: Number(form.horas_minimas_reprogramacion_cliente),
        minutos_minimos_cancelacion_cliente: Number(form.horas_minimas_cancelacion_cliente) * 60
      });

      if (!resp.ok) {
        setError(resp.message || 'No se pudo actualizar la configuracion.');
        return;
      }
      setInfo('Configuracion actualizada correctamente.');
    } catch {
      setError('Ocurrio un error al actualizar la configuracion.');
    }
  }

  return (
    <AdminLayout title="Configuracion general">
      <section className="card">
        <div className="section-header">
          <span className="section-badge">Parametros globales</span>
          <h2>Ajustes de operacion</h2>
          <p>El horario operativo ahora se gestiona por cada cancha.</p>
        </div>
        {cargando ? (
          <div className="empty-state"><p>Cargando configuracion...</p></div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group"><label>Intervalo en minutos</label><input type="number" name="intervalo_minutos" value={form.intervalo_minutos} onChange={handleChange} /></div>
              <div className="form-group"><label>Duraciones habilitadas</label><input type="text" name="duraciones_habilitadas" value={form.duraciones_habilitadas} onChange={handleChange} placeholder="60,90,120,150,180" /></div>
              <div className="form-group"><label>Anticipacion minima</label><input type="number" name="anticipacion_minima" value={form.anticipacion_minima} onChange={handleChange} /></div>
              <div className="form-group"><label>Telefono del club</label><input type="text" name="telefono_club" value={form.telefono_club} onChange={handleChange} /></div>
              <div className="form-group"><label>Tiempo minimo para cancelar (horas)</label><input type="number" name="horas_minimas_cancelacion_cliente" value={form.horas_minimas_cancelacion_cliente} onChange={handleChange} min="0" /></div>
              <div className="form-group"><label>Tiempo minimo para reprogramar (horas)</label><input type="number" name="horas_minimas_reprogramacion_cliente" value={form.horas_minimas_reprogramacion_cliente} onChange={handleChange} min="0" /></div>
            </div>
            <div className="form-group">
              <label>Logo del club</label>
              <input type="file" accept="image/*" onChange={handleLogoChange} />
              <p className="field-help">Carga una imagen desde tu PC. Formatos recomendados: PNG o JPG. Tamano maximo: 2 MB. Si tiene bordes transparentes, se recortan automaticamente.</p>
              {subiendoLogo && <p className="field-help">Procesando logo...</p>}
              {form.logo_url ? (
                <div className="logo-preview-box">
                  <img className="logo-preview-image" src={form.logo_url} alt="Vista previa del logo" />
                  <button type="button" className="secondary-btn small-btn" onClick={handleEliminarLogo}>Quitar logo</button>
                </div>
              ) : null}
            </div>
            <div className="form-group"><label>Mensaje de confirmacion</label><textarea className="admin-textarea" name="mensaje_confirmacion" value={form.mensaje_confirmacion} onChange={handleChange} rows={4} /></div>
            <button className="primary-btn" type="submit" disabled={subiendoLogo}>Guardar configuracion</button>
            {info && <div className="info-box mt-16">{info}</div>}
            {error && <div className="error-box mt-16">{error}</div>}
          </form>
        )}
      </section>
    </AdminLayout>
  );
}
