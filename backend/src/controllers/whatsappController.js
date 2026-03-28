const whatsappService = require('../services/whatsappService');

const verificarWebhook = (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'dev_verify_token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  return res.sendStatus(403);
};

const recibirWebhook = async (req, res) => {
  try {
    const from = req.body.From || req.body.from;
    const body = req.body.Body || req.body.body || '';
    if (!from) return res.status(400).json({ ok: false, message: 'Webhook sin remitente' });

    const resultado = await whatsappService.procesarMensajeEntrante({ from, body });
    if (resultado.shouldReply && resultado.message) {
      await whatsappService.enviarTexto(from, resultado.message);
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error webhook WhatsApp:', error.message);
    return res.status(500).json({ ok: false, message: 'Error procesando webhook de WhatsApp' });
  }
};

module.exports = { verificarWebhook, recibirWebhook };
