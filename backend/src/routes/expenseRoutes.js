const express = require('express');
const { body, param } = require('express-validator');
const { listExpenses, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');
const { requireGroupMember } = require('../middleware/groupAccessMiddleware');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router({ mergeParams: true });
router.use(protect);
router.use(requireGroupMember);

const expenseValidation = [
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('paidBy').isMongoId().withMessage('paidBy user id is required'),
  body('splitType').isIn(['equal', 'custom', 'percentage']).withMessage('Invalid split type'),
  body('participants').isArray({ min: 1 }).withMessage('Participants are required'),
  body('participants.*.user').isMongoId().withMessage('Participant user id is required')
];

router.get('/', [param('groupId').isMongoId()], validateRequest, listExpenses);
router.post('/', [param('groupId').isMongoId(), ...expenseValidation], validateRequest, createExpense);
router.put(
  '/:expenseId',
  [param('groupId').isMongoId(), param('expenseId').isMongoId(), ...expenseValidation],
  validateRequest,
  updateExpense
);
router.delete('/:expenseId', [param('groupId').isMongoId(), param('expenseId').isMongoId()], validateRequest, deleteExpense);

module.exports = router;
