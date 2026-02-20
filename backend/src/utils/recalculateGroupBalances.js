const Expense = require('../models/Expense');
const Transaction = require('../models/Transaction');

async function recalculateGroupBalances(groupId, session, sourceExpenseId = null, sourceExpenseName = '') {
  // Delete all existing transactions for this group
  await Transaction.deleteMany({ group: groupId }).session(session);
  
  // Fetch all expenses
  const expenses = await Expense.find({ group: groupId }).session(session);
  
  // Create one transaction per participant per expense
  for (const expense of expenses) {
    const paidBy = String(expense.paidBy);
    
    for (const participant of expense.participants) {
      const userId = String(participant.user);
      const amountOwed = participant.amount || 0;
      
      // Skip if payer owes themselves
      if (userId === paidBy || amountOwed <= 0) continue;
      
      // Create a transaction for this specific expense participant
      await Transaction.create([{
        group: groupId,
        pairKey: `${expense._id}_${userId}_${paidBy}`,
        from: userId,
        to: paidBy,
        amount: amountOwed,
        status: 'pending',
        confirmations: { from: false, to: false },
        expenseId: expense._id,
        expenseName: expense.description,
        history: [{
          action: 'CREATED_FROM_EXPENSE',
          amount: amountOwed,
          note: `Created from expense: ${expense.description}`
        }]
      }], { session });
    }
  }
  
  return [];
}

module.exports = { recalculateGroupBalances };