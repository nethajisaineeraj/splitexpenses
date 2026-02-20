const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/appError');

async function createGroup(req, res) {
  const { name, description } = req.body;
  const group = await Group.create({
    name,
    description: description || '',
    admin: req.user.id,
    members: [req.user.id]
  });
  res.status(201).json({ group });
}

async function listGroups(req, res) {
  const groups = await Group.find({ members: req.user.id }).populate('admin', 'name email').sort({ updatedAt: -1 });
  res.json({ groups });
}

async function getGroupById(req, res) {
  const group = await Group.findById(req.params.groupId)
    .populate('admin', 'name email')
    .populate('members', 'name email');
  if (!group) throw new AppError('Group not found', 404);
  const isMember = group.members.some((member) => String(member._id) === String(req.user.id));
  if (!isMember) throw new AppError('Unauthorized group access', 403);
  res.json({ group });
}

async function addMember(req, res) {
  const { email } = req.body;
  const group = req.group;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('User not found by email', 404);

  const alreadyMember = group.members.some((memberId) => String(memberId) === String(user._id));
  if (alreadyMember) throw new AppError('User already in group', 400);

  group.members.push(user._id);
  await group.save();
  res.json({ message: 'Member added', member: { id: user._id, name: user.name, email: user.email } });
}

async function removeMember(req, res) {
  const group = req.group;
  const memberId = req.params.memberId;

  if (String(group.admin) == String(memberId)) {
    throw new AppError('Admin cannot be removed from group', 400);
  }

  group.members = group.members.filter((id) => String(id) !== String(memberId));
  await group.save();

  res.json({ message: 'Member removed' });
}

async function leaveGroup(req, res) {
  const group = req.group;
  if (String(group.admin) === String(req.user.id)) {
    throw new AppError('Admin cannot leave group without transferring admin rights', 400);
  }

  group.members = group.members.filter((id) => String(id) !== String(req.user.id));
  await group.save();
  res.json({ message: 'You left the group' });
}

async function transferAdmin(req, res) {
  const group = req.group;
  const { newAdminId } = req.body;

  if (!newAdminId) throw new AppError('New admin is required', 400);
  if (String(group.admin) === String(newAdminId)) {
    throw new AppError('User is already admin', 400);
  }

  const isMember = group.members.some((memberId) => String(memberId) === String(newAdminId));
  if (!isMember) throw new AppError('User is not a group member', 400);

  group.admin = newAdminId;
  await group.save();
  res.json({ message: 'Admin transferred', adminId: group.admin });
}

async function deleteGroup(req, res) {
  const group = req.group;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    await Expense.deleteMany({ group: group._id }).session(session);
    await Transaction.deleteMany({ group: group._id }).session(session);
    await Group.deleteOne({ _id: group._id }).session(session);
    await session.commitTransaction();
    res.json({ message: 'Group deleted' });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function dashboard(req, res) {
  const userId = req.user.id;
  const groups = await Group.find({ members: userId }).select('_id name');
  const groupIds = groups.map((g) => g._id);

  const allTransactions = await Transaction.find({
    group: { $in: groupIds },
    $or: [{ from: userId }, { to: userId }],
    status: 'pending'
  })
    .populate('from', 'name email')
    .populate('to', 'name email')
    .populate('group', 'name');

  const oweToPeople = {};
  const receiveFromPeople = {};

  allTransactions.forEach((txn) => {
    const isDebtor = String(txn.from._id) === String(userId);
    const isCreditor = String(txn.to._id) === String(userId);
    const confirmedFrom = Boolean(txn.confirmations?.from);
    const confirmedTo = Boolean(txn.confirmations?.to);

    if (isDebtor) {
      const creditorId = String(txn.to._id);
      if (!oweToPeople[creditorId]) {
        oweToPeople[creditorId] = {
          personId: creditorId,
          name: txn.to.name,
          email: txn.to.email,
          amount: 0,
          transactions: []
        };
      }
      oweToPeople[creditorId].amount += txn.amount;
      oweToPeople[creditorId].transactions.push({
        id: txn._id,
        amount: txn.amount,
        expenseName: txn.expenseName,
        groupName: txn.group.name,
        confirmedByMe: confirmedFrom,
        confirmedByThem: confirmedTo,
        confirmations: { from: confirmedFrom, to: confirmedTo }
      });
    }

    if (isCreditor) {
      const debtorId = String(txn.from._id);
      if (!receiveFromPeople[debtorId]) {
        receiveFromPeople[debtorId] = {
          personId: debtorId,
          name: txn.from.name,
          email: txn.from.email,
          amount: 0,
          transactions: []
        };
      }
      receiveFromPeople[debtorId].amount += txn.amount;
      receiveFromPeople[debtorId].transactions.push({
        id: txn._id,
        amount: txn.amount,
        expenseName: txn.expenseName,
        groupName: txn.group.name,
        confirmedByMe: confirmedTo,
        confirmedByThem: confirmedFrom,
        confirmations: { from: confirmedFrom, to: confirmedTo }
      });
    }
  });

  const totalOwed = Object.values(oweToPeople).reduce((sum, p) => sum + p.amount, 0);
  const totalReceive = Object.values(receiveFromPeople).reduce((sum, p) => sum + p.amount, 0);

  const recentExpenses = await Expense.find({ group: { $in: groupIds } })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('group', 'name')
    .populate('paidBy', 'name')
    .select('description amount group paidBy createdAt');

  res.json({
    totals: { owed: totalOwed, receive: totalReceive },
    oweToPeople: Object.values(oweToPeople),
    receiveFromPeople: Object.values(receiveFromPeople),
    recentActivity: recentExpenses
  });
}

module.exports = {
  createGroup,
  listGroups,
  getGroupById,
  addMember,
  removeMember,
  leaveGroup,
  transferAdmin,
  deleteGroup,
  dashboard
};