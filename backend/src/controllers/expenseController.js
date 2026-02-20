const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const AppError = require('../utils/appError');
const { normalizeParticipants } = require('../utils/calculateSplits');
const { recalculateGroupBalances } = require('../utils/recalculateGroupBalances');

function ensureParticipantsInGroup(participants, group) {
  const groupMemberSet = new Set(group.members.map((id) => String(id)));
  for (const p of participants) {
    if (!groupMemberSet.has(String(p.user))) {
      throw new AppError('All participants must be group members', 400);
    }
  }
}

async function listExpenses(req, res) {
  const expenses = await Expense.find({ group: req.params.groupId })
    .populate('paidBy', 'name email')
    .populate('participants.user', 'name email')
    .sort({ createdAt: -1 });
  res.json({ expenses });
}

async function createExpense(req, res) {
  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      const group = await Group.findById(req.params.groupId).session(session);
      if (!group) throw new AppError('Group not found', 404);

      const isMember = group.members.some((id) => String(id) === String(req.user.id));
      if (!isMember) throw new AppError('Unauthorized group access', 403);

      const payload = {
        description: req.body.description,
        amount: Number(req.body.amount),
        paidBy: req.body.paidBy,
        splitType: req.body.splitType,
        participants: req.body.participants || []
      };

      ensureParticipantsInGroup(payload.participants, group);
      payload.participants = normalizeParticipants(payload);

      [created] = await Expense.create(
        [{ ...payload, group: group._id, createdBy: req.user.id, updatedBy: req.user.id }],
        { session }
      );

      await recalculateGroupBalances(group._id, session, created._id, created.description);
    });

    res.status(201).json({ expense: created });
  } finally {
    session.endSession();
  }
}

async function updateExpense(req, res) {
  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      const expense = await Expense.findById(req.params.expenseId).session(session);
      if (!expense) throw new AppError('Expense not found', 404);
      if (String(expense.group) !== String(req.params.groupId)) {
        throw new AppError('Expense does not belong to group', 400);
      }

      const group = await Group.findById(req.params.groupId).session(session);
      if (!group) throw new AppError('Group not found', 404);
      const isMember = group.members.some((id) => String(id) === String(req.user.id));
      if (!isMember) throw new AppError('Unauthorized group access', 403);

      const payload = {
        description: req.body.description ?? expense.description,
        amount: Number(req.body.amount ?? expense.amount),
        paidBy: req.body.paidBy ?? expense.paidBy,
        splitType: req.body.splitType ?? expense.splitType,
        participants: req.body.participants ?? expense.participants
      };

      ensureParticipantsInGroup(payload.participants, group);
      payload.participants = normalizeParticipants(payload);

      expense.description = payload.description;
      expense.amount = payload.amount;
      expense.paidBy = payload.paidBy;
      expense.splitType = payload.splitType;
      expense.participants = payload.participants;
      expense.updatedBy = req.user.id;

      updated = await expense.save({ session });
      await recalculateGroupBalances(group._id, session, updated._id, updated.description);
    });

    res.json({ expense: updated });
  } finally {
    session.endSession();
  }
}

async function deleteExpense(req, res) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const expense = await Expense.findById(req.params.expenseId).session(session);
      if (!expense) throw new AppError('Expense not found', 404);
      if (String(expense.group) !== String(req.params.groupId)) {
        throw new AppError('Expense does not belong to group', 400);
      }

      const group = await Group.findById(req.params.groupId).session(session);
      if (!group) throw new AppError('Group not found', 404);
      const isMember = group.members.some((id) => String(id) === String(req.user.id));
      if (!isMember) throw new AppError('Unauthorized group access', 403);

      await expense.deleteOne({ session });
      await recalculateGroupBalances(group._id, session);
    });

    res.json({ message: 'Expense deleted' });
  } finally {
    session.endSession();
  }
}

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense };
