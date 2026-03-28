const db = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { formatCurrency } = require('../utils/currency');

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function obtenerResumen({ desde, hasta, cancha_id, page = 1, pageSize = 10 }) {
  if (!desde || !hasta) {
    throw new Error('parámetros desde y hasta son obligatorios');
  }

  const params = [desde, hasta];
  let canchaFilter = '';

  if (cancha_id) {
    canchaFilter = ' AND r.cancha_id = ?';
    params.push(cancha_id);
  }

  // Resumen general
  const resumenData = await dbGet(
    `SELECT
      COUNT(*) AS total_reservas,
      SUM(CASE WHEN r.estado = 'confirmada' THEN 1 ELSE 0 END) AS total_confirmadas,
      SUM(CASE WHEN r.estado = 'cancelada' THEN 1 ELSE 0 END) AS total_canceladas,
      SUM(CASE WHEN r.estado = 'reprogramada' THEN 1 ELSE 0 END) AS total_reprogramadas,
      COALESCE(SUM(r.precio_total), 0) AS ingresos_estimados,
      COALESCE(SUM(CASE WHEN r.con_luz = true THEN 1 ELSE 0 END), 0) AS reservas_con_luz
      FROM reservas r
      WHERE r.fecha BETWEEN ? AND ?${canchaFilter}`,
    params
  );

  // Por día
  const porDia = await dbAll(
    `SELECT r.fecha, COUNT(*) AS reservas, COALESCE(SUM(r.precio_total), 0) AS ingresos
      FROM reservas r
      WHERE r.fecha BETWEEN ? AND ?${canchaFilter}
      GROUP BY r.fecha
      ORDER BY r.fecha ASC`,
    params
  );

  // Por cancha
  const porCanchaParams = cancha_id ? [desde, hasta, cancha_id] : [desde, hasta];
  const porCancha = await dbAll(
    `SELECT c.nombre AS cancha, COUNT(r.id) AS reservas, COALESCE(SUM(r.precio_total), 0) AS ingresos
      FROM canchas c
      LEFT JOIN reservas r ON r.cancha_id = c.id AND r.fecha BETWEEN ? AND ?${canchaFilter}
      GROUP BY c.id, c.nombre
      ORDER BY COUNT(r.id) DESC`,
    porCanchaParams
  );

  // Por horario
  const porHorario = await dbAll(
    `SELECT r.hora_inicio, COUNT(*) AS reservas, COALESCE(SUM(r.precio_total), 0) AS ingresos
      FROM reservas r
      WHERE r.fecha BETWEEN ? AND ?${canchaFilter}
      GROUP BY r.hora_inicio
      ORDER BY r.hora_inicio ASC`,
    params
  );

  // Total de registros para paginación
  const totalResult = await dbGet(
    `SELECT COUNT(*) AS total FROM reservas r
      INNER JOIN canchas c ON c.id = r.cancha_id
      WHERE r.fecha BETWEEN ? AND ?${canchaFilter}`,
    params
  );
  const total = parseInt(totalResult?.total || 0);
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  // Detalle de reservas con paginación
  const detalle = await dbAll(
    `SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, r.nombre_cliente, c.nombre AS cancha, r.estado, r.precio_total, r.con_luz
      FROM reservas r
      INNER JOIN canchas c ON c.id = r.cancha_id
      WHERE r.fecha BETWEEN ? AND ?${canchaFilter}
      ORDER BY r.fecha DESC, r.hora_inicio DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    resumen: resumenData,
    por_dia: porDia || [],
    por_cancha: porCancha || [],
    por_horario: porHorario || [],
    detalle: detalle || [],
    detalle_pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages
    }
  };
}

const resumen = async (req, res) => {
  try {
    const { desde, hasta, cancha_id, page = 1, page_size = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.max(1, parseInt(page_size) || 10);
    
    const data = await obtenerResumen({ desde, hasta, cancha_id, page: pageNum, pageSize });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Error al obtener resumen' });
  }
};

const exportarExcel = async (req, res) => {
  try {
    const { desde, hasta, cancha_id } = req.query;
    const data = await obtenerResumen({ desde, hasta, cancha_id });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte');

    sheet.columns = [
      { header: 'Métrica', key: 'metrica', width: 30 },
      { header: 'Valor', key: 'valor', width: 20 }
    ];

    sheet.addRow({ metrica: 'Total reservas', valor: data.resumen.total_reservas });
    sheet.addRow({ metrica: 'Confirmadas', valor: data.resumen.total_confirmadas });
    sheet.addRow({ metrica: 'Canceladas', valor: data.resumen.total_canceladas });
    sheet.addRow({ metrica: 'Reprogramadas', valor: data.resumen.total_reprogramadas });
    sheet.addRow({ metrica: 'Ingresos', valor: formatCurrency(data.resumen.ingresos_estimados) });
    sheet.addRow({ metrica: 'Reservas con luz', valor: data.resumen.reservas_con_luz });

    sheet.addRow({});
    sheet.addRow({ metrica: 'Canchas' });
    sheet.addRow({ metrica: 'Nombre', valor: 'Reservas' });

    data.por_cancha.forEach((cancha) => {
      sheet.addRow({ metrica: cancha.cancha, valor: cancha.reservas });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.xlsx"');

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || 'Error al exportar Excel' });
  }
};

const exportarPdf = async (req, res) => {
  try {
    const { desde, hasta, cancha_id } = req.query;
    const data = await obtenerResumen({ desde, hasta, cancha_id });

    const doc = new PDFDocument();
    let buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte.pdf"');
      res.end(pdfData);
    });

    doc.fontSize(14).text('Reporte de Reservas', { underline: true });
    doc.moveDown();

    doc.fontSize(10).text(`Desde: ${desde} - Hasta: ${hasta}`);
    doc.text(`Total reservas: ${data.resumen.total_reservas}`);
    doc.text(`Confirmadas: ${data.resumen.total_confirmadas}`);
    doc.text(`Canceladas: ${data.resumen.total_canceladas}`);
    doc.text(`Reprogramadas: ${data.resumen.total_reprogramadas}`);
    doc.text(`Ingresos: ${formatCurrency(data.resumen.ingresos_estimados)}`);
    doc.text(`Reservas con luz: ${data.resumen.reservas_con_luz}`);
    doc.moveDown();

    doc.text('Resumen por cancha:', { underline: true });
    data.por_cancha.forEach((cancha) => {
      doc.text(`- ${cancha.cancha}: ${cancha.reservas} reservas, ingresos ${formatCurrency(cancha.ingresos)}`);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || 'Error al exportar PDF' });
  }
};

module.exports = { resumen, exportarExcel, exportarPdf };

