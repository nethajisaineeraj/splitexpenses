const Group = require('../models/Group');
const AppError = require('../utils/appError');

async function requireGroupMember(req, res, next) {
  const groupId = req.params.groupId || req.body.groupId;
  if (!groupId) throw new AppError('Group ID is required', 400);

  const group = await Group.findById(groupId);
  if (!group) throw new AppError('Group not found', 404);

  const isMember = group.members.some((memberId) => String(memberId) === String(req.user.id));
  if (!isMember) throw new AppError('Unauthorized group access', 403);

  req.group = group;
  next();
}

async function requireGroupAdmin(req, res, next) {
  const group = req.group || (await Group.findById(req.params.groupId));
  if (!group) throw new AppError('Group not found', 404);
  if (String(group.admin) !== String(req.user.id)) {
    throw new AppError('Only group admin can perform this action', 403);
  }
  req.group = group;
  next();
}

module.exports = { requireGroupMember, requireGroupAdmin };
