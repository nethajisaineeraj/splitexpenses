const express = require('express');
const { body, param } = require('express-validator');
const {
  createGroup,
  listGroups,
  getGroupById,
  addMember,
  removeMember,
  leaveGroup,
  transferAdmin,
  deleteGroup,
  dashboard
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const { requireGroupMember, requireGroupAdmin } = require('../middleware/groupAccessMiddleware');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();
router.use(protect);

router.get('/', listGroups);
router.get('/dashboard', dashboard);
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Group name is required')],
  validateRequest,
  createGroup
);

router.get('/:groupId', [param('groupId').isMongoId().withMessage('Invalid group id')], validateRequest, getGroupById);

router.patch(
  '/:groupId/admin',
  [
    param('groupId').isMongoId().withMessage('Invalid group id'),
    body('newAdminId').isMongoId().withMessage('Invalid new admin id')
  ],
  validateRequest,
  requireGroupAdmin,
  transferAdmin
);

router.post(
  '/:groupId/members',
  [param('groupId').isMongoId(), body('email').isEmail().withMessage('Valid member email required')],
  validateRequest,
  requireGroupMember,
  requireGroupAdmin,
  addMember
);

router.delete(
  '/:groupId/members/:memberId',
  [param('groupId').isMongoId(), param('memberId').isMongoId()],
  validateRequest,
  requireGroupMember,
  requireGroupAdmin,
  removeMember
);

router.post('/:groupId/leave', [param('groupId').isMongoId()], validateRequest, requireGroupMember, leaveGroup);

router.delete(
  '/:groupId',
  [param('groupId').isMongoId().withMessage('Invalid group id')],
  validateRequest,
  requireGroupAdmin,
  deleteGroup
);

module.exports = router;
