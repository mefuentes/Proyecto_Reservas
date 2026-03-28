const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/webhook', whatsappController.verificarWebhook);
router.post('/webhook', whatsappController.recibirWebhook);

module.exports = router;
