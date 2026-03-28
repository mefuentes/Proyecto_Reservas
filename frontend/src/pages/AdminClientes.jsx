import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { obtenerClientesAdmin, actualizarClienteAdmin, crearClienteAdmin, eliminarClienteAdmin } from '../services/adminApi';

function normalizarDocumentoInput(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function normalizarNombreInput(valor) {
  return String(valor || '').toUpperCase();
}

export default function AdminClientes() {
  const pageSize = 10;
  const [q, setQ] = useState('');
  const [clientes, setClientes] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, page_size: pageSize, total_pages: 1 });
  const [editando, setEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState({ nombre_apellido: '', telefono: '' });
  const [nuevoCliente, setNuevoCliente] = useState({ documento: '', nombre_apellido: '', telefono: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  async function cargarClientes(pageOverride = page) {
    setError('');
    const resp = await obtenerClientesAdmin(q, pageOverride, pageSize);
    if (!resp.ok) return setError(resp.message || 'No se pudieron cargar los clientes.');
    setClientes(resp.data || []);
    setPagination(resp.pagination || { total: 0, page: 1, page_size: pageSize, total_pages: 1 });
  }

  useEffect(() => { cargarClientes(); }, [page]);

  function iniciarEdicion(cliente) {
    setEditando(cliente.id);
    setFormEdicion({ nombre_apellido: cliente.nombre_apellido || '', telefono: cliente.telefono || '' });
  }

  async function guardarCambios(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    const resp = await actualizarClienteAdmin(editando, formEdicion);
    if (!resp.ok) return setError(resp.message || 'No se pudo actualizar el cliente.');
    setInfo('Cliente actualizado correctamente.');
    setEditando(null);
    cargarClientes();
  }

  async function crearNuevoCliente(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!nuevoCliente.documento || !nuevoCliente.nombre_apellido.trim()) {
      setError('Documento y nombre/apellido son obligatorios.');
      return;
    }

    try {
      setGuardandoNuevo(true);
      const resp = await crearClienteAdmin(nuevoCliente);
      if (!resp.ok) return setError(resp.message || 'No se pudo crear el cliente.');
      setInfo('Cliente creado correctamente.');
      setNuevoCliente({ documento: '', nombre_apellido: '', telefono: '' });
      setPage(1);
      await cargarClientes();
    } finally {
      setGuardandoNuevo(false);
    }
  }

  async function eliminarCliente(id) {
    setError('');
    setInfo('');
    const confirmar = window.confirm('Se eliminara el cliente seleccionado. Desea continuar?');
    if (!confirmar) return;
    const resp = await eliminarClienteAdmin(id);
    if (!resp.ok) return setError(resp.message || 'No se pudo eliminar el cliente.');
    setInfo('Cliente eliminado correctamente.');
    if (editando === id) setEditando(null);
    if (clientes.length === 1 && page > 1) setPage((prev) => prev - 1);
    await cargarClientes();
  }

  return (
    <AdminLayout title="Clientes">
      <section className="card">
        <div className="section-header">
          <span className="section-badge">Alta de cliente</span>
          <h2>Crear nuevo cliente</h2>
          <p>Los nombres se guardan en mayuscula para mantener consistencia.</p>
        </div>
        <form onSubmit={crearNuevoCliente}>
          <div className="form-grid">
            <div className="form-group">
              <label>Documento</label>
              <input type="text" value={nuevoCliente.documento} onChange={(e) => setNuevoCliente((p) => ({ ...p, documento: normalizarDocumentoInput(e.target.value) }))} placeholder="Documento" />
            </div>
            <div className="form-group">
              <label>Nombre y apellido</label>
              <input type="text" value={nuevoCliente.nombre_apellido} onChange={(e) => setNuevoCliente((p) => ({ ...p, nombre_apellido: normalizarNombreInput(e.target.value) }))} placeholder="NOMBRE APELLIDO" />
            </div>
            <div className="form-group">
              <label>Telefono</label>
              <input type="text" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente((p) => ({ ...p, telefono: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <button className="primary-btn" type="submit" disabled={guardandoNuevo}>{guardandoNuevo ? 'Guardando...' : 'Agregar cliente'}</button>
        </form>
      </section>

      <section className="card">
        <div className="admin-toolbar">
          <div className="form-group grow-field">
            <label>Buscar</label>
            <input type="text" value={q} onChange={(e) => setQ(normalizarNombreInput(e.target.value))} placeholder="Documento, nombre o apellido" />
          </div>
          <button className="primary-btn auto-btn" onClick={() => { setPage(1); cargarClientes(1); }}>Buscar</button>
        </div>
      </section>

      {editando && (
        <section className="card">
          <h2>Editar cliente</h2>
          <form onSubmit={guardarCambios}>
            <div className="form-grid two-cols">
              <div className="form-group"><label>Nombre y apellido</label><input type="text" value={formEdicion.nombre_apellido} onChange={(e) => setFormEdicion((p) => ({ ...p, nombre_apellido: normalizarNombreInput(e.target.value) }))} /></div>
              <div className="form-group"><label>Telefono</label><input type="text" value={formEdicion.telefono} onChange={(e) => setFormEdicion((p) => ({ ...p, telefono: e.target.value }))} /></div>
            </div>
            <div className="admin-actions"><button className="primary-btn" type="submit">Guardar</button><button className="secondary-btn" type="button" onClick={() => setEditando(null)}>Cancelar</button></div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Documento</th><th>Nombre y apellido</th><th>Telefono</th><th>Reservas</th><th>Acciones</th></tr></thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.documento}</td>
                  <td>{cliente.nombre_apellido}</td>
                  <td>{cliente.telefono || '-'}</td>
                  <td>{cliente.cantidad_reservas || 0}</td>
                  <td>
                    <div className="table-actions">
                      <button className="secondary-btn small-btn" onClick={() => iniciarEdicion(cliente)}>Editar</button>
                      <button className="danger-btn small-btn" onClick={() => eliminarCliente(cliente.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.total_pages > 1 && (
          <div className="pagination-bar">
            <button type="button" className="secondary-btn small-btn" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1}>Anterior</button>
            <span className="pagination-text">Pagina {pagination.page} de {pagination.total_pages} · {pagination.total} registros</span>
            <button type="button" className="secondary-btn small-btn" onClick={() => setPage((prev) => Math.min(prev + 1, pagination.total_pages))} disabled={page >= pagination.total_pages}>Siguiente</button>
          </div>
        )}
        {info && <div className="info-box mt-16">{info}</div>}
        {error && <div className="error-box mt-16">{error}</div>}
      </section>
    </AdminLayout>
  );
}
