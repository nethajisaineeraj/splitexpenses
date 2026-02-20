const AppError = require('./appError');

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeParticipants(expense) {
  const { splitType, participants, amount } = expense;

  if (!participants || participants.length === 0) {
    throw new AppError('Participants are required', 400);
  }

  if (splitType === 'equal') {
    const each = round2(amount / participants.length);
    const remainder = round2(amount - each * participants.length);
    return participants.map((item, index) => {
      const extra = index === 0 ? remainder : 0;
      return { user: item.user, amount: round2(each + extra), percentage: 0 };
    });
  }

  if (splitType === 'custom') {
    const sum = round2(participants.reduce((acc, item) => acc + Number(item.amount || 0), 0));
    if (sum !== round2(amount)) {
      throw new AppError('Custom amounts must add up to total amount', 400);
    }
    return participants.map((item) => ({ user: item.user, amount: round2(Number(item.amount || 0)), percentage: 0 }));
  }

  if (splitType === 'percentage') {
    const pctSum = round2(participants.reduce((acc, item) => acc + Number(item.percentage || 0), 0));
    if (pctSum !== 100) {
      throw new AppError('Percentages must add up to 100', 400);
    }
    return participants.map((item) => {
      const pct = Number(item.percentage || 0);
      return {
        user: item.user,
        percentage: pct,
        amount: round2((amount * pct) / 100)
      };
    });
  }

  throw new AppError('Invalid splitType', 400);
}

module.exports = { normalizeParticipants, round2 };
