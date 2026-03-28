import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerTarifas, crearTarifa, actualizarTarifa, eliminarTarifa, obtenerCanchasAdmin } from '../services/adminApi';
import { formatCurrency } from '../utils/currency';

export default function AdminTarifas() {
  const [tarifas, setTarifas] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ cancha_id: '', duracion_minutos: '60', precio_base: '', adicional_luz: '', activa: 1 });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function cargar() {
    const [tResp, cResp] = await Promise.all([obtenerTarifas(), obtenerCanchasAdmin()]);
    if (tResp.ok) setTarifas(tResp.data || []);
    if (cResp.ok) setCanchas(cResp.data || []);
  }
  useEffect(() => { cargar(); }, []);

  function reset() { setEditandoId(null); setForm({ cancha_id: '', duracion_minutos: '60', precio_base: '', adicional_luz: '', activa: 1 }); }
  function handleChange(e) { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setInfo('');
    if (form.precio_base === '' || form.adicional_luz === '') { setError('Completá precio base y adicional por luz.'); return; }
    const payload = { cancha_id: form.cancha_id ? Number(form.cancha_id) : null, duracion_minutos: Number(form.duracion_minutos), precio_base: Number(form.precio_base), adicional_luz: Number(form.adicional_luz), activa: Number(form.activa) };
    const resp = editandoId ? await actualizarTarifa(editandoId, payload) : await crearTarifa(payload);
    if (!resp.ok) { setError(resp.message || 'No se pudo guardar la tarifa.'); return; }
    setInfo(editandoId ? 'Tarifa actualizada.' : 'Tarifa creada.'); reset(); cargar();
  }

  function editar(t) { setEditandoId(t.id); setForm({ cancha_id: t.cancha_id || '', duracion_minutos: String(t.duracion_minutos), precio_base: String(t.precio_base), adicional_luz: String(t.adicional_luz), activa: t.activa }); }
  async function borrar(id) { if (!window.confirm('¿Eliminar tarifa?')) return; const resp = await eliminarTarifa(id); if (!resp.ok) setError(resp.message || 'No se pudo eliminar.'); else { setInfo('Tarifa eliminada.'); cargar(); if (editandoId === id) reset(); } }

  return (
    <AdminLayout title="Tarifas">
      <section className="card">
        <h2>{editandoId ? 'Editar tarifa' : 'Nueva tarifa'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group"><label>Cancha</label><select name="cancha_id" value={form.cancha_id} onChange={handleChange}><option value="">General (todas)</option>{canchas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
            <div className="form-group"><label>Duración</label><select name="duracion_minutos" value={form.duracion_minutos} onChange={handleChange}>{[60,90,120,150,180].map((d)=><option key={d} value={d}>{d} minutos</option>)}</select></div>
            <div className="form-group"><label>Precio base</label><input name="precio_base" value={form.precio_base} onChange={handleChange} type="number" min="0" step="0.01" /></div>
            <div className="form-group"><label>Adicional luz</label><input name="adicional_luz" value={form.adicional_luz} onChange={handleChange} type="number" min="0" step="0.01" /></div>
          </div>
          <div className="admin-actions">
            <button className="primary-btn" type="submit">{editandoId ? 'Guardar cambios' : 'Crear tarifa'}</button>
            {editandoId && <button className="secondary-btn" type="button" onClick={reset}>Cancelar</button>}
          </div>
        </form>
        {info && <div className="info-box mt-16">{info}</div>}
        {error && <div className="error-box mt-16">{error}</div>}
      </section>
      <section className="card">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Cancha</th><th>Duración</th><th>Precio base</th><th>Adicional luz</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {tarifas.map((t) => (
                <tr key={t.id}>
                  <td>{t.cancha_nombre || 'General'}</td>
                  <td>{t.duracion_minutos} min</td>
                  <td>{formatCurrency(t.precio_base)}</td>
                  <td>{formatCurrency(t.adicional_luz)}</td>
                  <td>{t.activa ? 'Activa' : 'Inactiva'}</td>
                  <td><div className="table-actions"><button className="secondary-btn small-btn" onClick={() => editar(t)}>Editar</button><button className="danger-btn small-btn" onClick={() => borrar(t.id)}>Eliminar</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
