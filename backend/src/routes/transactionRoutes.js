const express = require('express');
const { param } = require('express-validator');
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();
router.use(protect);

router.get('/groups/:groupId/transactions', [param('groupId').isMongoId()], validateRequest, transactionController.listTransactionsByGroup);
router.patch('/transactions/:transactionId/confirm-paid', [param('transactionId').isMongoId()], validateRequest, transactionController.confirmPaid);
router.patch('/transactions/:transactionId/confirm-received', [param('transactionId').isMongoId()], validateRequest, transactionController.confirmReceived);
router.patch('/transactions/bulk-confirm-paid', transactionController.bulkConfirmPaid);
router.patch('/transactions/bulk-confirm-received', transactionController.bulkConfirmReceived);

module.exports = router;