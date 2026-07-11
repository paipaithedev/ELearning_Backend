const express = require('express');
const certificateController = require('../controllers/certificateController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');
const validate = require('../middlewares/validate');
const certificateValidation = require('../validations/certificate');

const router = express.Router();

router.post('/', auth, validate({ body: certificateValidation.issueCertificateBody }), certificateController.issueCertificate);
router.get('/me', auth, certificateController.myCertificates);

// Download Routes (matching frontend MyCertificatesPage.tsx)
router.get('/:id/download', auth, certificateController.downloadCertificate);
router.get('/download/:id', auth, certificateController.downloadCertificate);
router.get('/:id/pdf', auth, certificateController.downloadCertificate);

// Admin Routes
router.get('/', auth, role('admin'), certificateController.listAllCertificates);
router.delete('/:id', auth, role('admin'), certificateController.deleteCertificate);

module.exports = router;
