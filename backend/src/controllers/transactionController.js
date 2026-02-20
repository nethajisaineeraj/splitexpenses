const Transaction = require('../models/Transaction');
const Group = require('../models/Group');
const AppError = require('../utils/appError');

async function listTransactionsByGroup(req, res) {
  const group = await Group.findById(req.params.groupId);
  if (!group) throw new AppError('Group not found', 404);

  const isMember = group.members.some((id) => String(id) === String(req.user.id));
  if (!isMember) throw new AppError('Unauthorized group access', 403);

  const transactions = await Transaction.find({ group: group._id })
    .populate('from', 'name email')
    .populate('to', 'name email')
    .sort({ updatedAt: -1 });

  res.json({ transactions });
}

async function confirmPaid(req, res) {
  const transaction = await Transaction.findById(req.params.transactionId);
  if (!transaction) throw new AppError('Transaction not found', 404);

  if (String(transaction.from) !== String(req.user.id)) {
    throw new AppError('Only debtor can confirm paid', 403);
  }
  if (transaction.amount <= 0) {
    throw new AppError('Transaction is already settled', 400);
  }

  transaction.confirmations.from = true;
  transaction.history.push({ action: 'MARKED_PAID', amount: transaction.amount, by: req.user.id });

  if (transaction.confirmations.from && transaction.confirmations.to) {
    transaction.history.push({ action: 'SETTLED', amount: transaction.amount, by: req.user.id });
    transaction.amount = 0;
    transaction.status = 'settled';
    transaction.confirmations = { from: false, to: false };
  }

  await transaction.save();
  res.json({ transaction });
}

async function confirmReceived(req, res) {
  const transaction = await Transaction.findById(req.params.transactionId);
  if (!transaction) throw new AppError('Transaction not found', 404);

  if (String(transaction.to) !== String(req.user.id)) {
    throw new AppError('Only creditor can confirm received', 403);
  }
  if (transaction.amount <= 0) {
    throw new AppError('Transaction is already settled', 400);
  }

  transaction.confirmations.to = true;
  transaction.history.push({ action: 'MARKED_RECEIVED', amount: transaction.amount, by: req.user.id });

  if (transaction.confirmations.from && transaction.confirmations.to) {
    transaction.history.push({ action: 'SETTLED', amount: transaction.amount, by: req.user.id });
    transaction.amount = 0;
    transaction.status = 'settled';
    transaction.confirmations = { from: false, to: false };
  }

  await transaction.save();
  res.json({ transaction });
}

// // Bulk confirm paid - mark all transactions to a specific person as paid
// async function bulkConfirmPaid(req, res) {
//   try {
//     const { personId } = req.body;
    
//     if (!personId) {
//       return res.status(400).json({ message: 'Person ID is required' });
//     }

//     // Find all pending transactions where current user owes money to personId
//     const transactions = await Transaction.find({
//       from: req.user._id,
//       to: personId,
//       status: 'pending'
//     });

//     if (transactions.length === 0) {
//       return res.status(404).json({ message: 'No pending transactions found' });
//     }

//     // Update all transactions
//     const updatePromises = transactions.map(async (transaction) => {
//       transaction.confirmations.from = true;
      
//       // If the other person has also confirmed, mark as settled
//       if (transaction.confirmations.to) {
//         transaction.status = 'settled';
//       }
      
//       return transaction.save();
//     });

//     await Promise.all(updatePromises);

//     res.json({ 
//       message: `Confirmed payment for ${transactions.length} transaction(s)`,
//       count: transactions.length
//     });
//   } catch (error) {
//     console.error('Bulk confirm paid error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// }

// // Bulk confirm received - mark all transactions from a specific person as received
// async function bulkConfirmReceived(req, res) {
//   try {
//     const { personId } = req.body;
    
//     if (!personId) {
//       return res.status(400).json({ message: 'Person ID is required' });
//     }

//     // Find all pending transactions where personId owes money to current user
//     const transactions = await Transaction.find({
//       from: personId,
//       to: req.user._id,
//       status: 'pending'
//     });

//     if (transactions.length === 0) {
//       return res.status(404).json({ message: 'No pending transactions found' });
//     }

//     // Update all transactions
//     const updatePromises = transactions.map(async (transaction) => {
//       transaction.confirmations.to = true;
      
//       // If the other person has also confirmed, mark as settled
//       if (transaction.confirmations.from) {
//         transaction.status = 'settled';
//       }
      
//       return transaction.save();
//     });

//     await Promise.all(updatePromises);

//     res.json({ 
//       message: `Confirmed receipt for ${transactions.length} transaction(s)`,
//       count: transactions.length
//     });
//   } catch (error) {
//     console.error('Bulk confirm received error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// }

// Bulk confirm paid - mark all transactions to a specific person as paid
async function bulkConfirmPaid(req, res) {
  try {
    const { personId } = req.body;
    
    if (!personId) {
      return res.status(400).json({ message: 'Person ID is required' });
    }

    // Find all unsettled transactions where current user owes money to personId
    const transactions = await Transaction.find({
      from: req.user.id,
      to: personId,
      amount: { $gt: 0 }  // Only transactions with amount > 0
    });

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'No pending transactions found' });
    }

    // Update all transactions
    const updatePromises = transactions.map(async (transaction) => {
      transaction.confirmations.from = true;
      transaction.history.push({ 
        action: 'MARKED_PAID', 
        amount: transaction.amount, 
        by: req.user.id 
      });
      
      // If the other person has also confirmed, mark as settled
      if (transaction.confirmations.to) {
        transaction.history.push({ 
          action: 'SETTLED', 
          amount: transaction.amount, 
          by: req.user.id 
        });
        transaction.amount = 0;
        transaction.status = 'settled';
        transaction.confirmations = { from: false, to: false };
      }
      
      return transaction.save();
    });

    await Promise.all(updatePromises);

    res.json({ 
      message: `Confirmed payment for ${transactions.length} transaction(s)`,
      count: transactions.length
    });
  } catch (error) {
    console.error('Bulk confirm paid error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Bulk confirm received - mark all transactions from a specific person as received
async function bulkConfirmReceived(req, res) {
  try {
    const { personId } = req.body;
    
    if (!personId) {
      return res.status(400).json({ message: 'Person ID is required' });
    }

    // Find all unsettled transactions where personId owes money to current user
    const transactions = await Transaction.find({
      from: personId,
      to: req.user.id,
      amount: { $gt: 0 }  // Only transactions with amount > 0
    });

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'No pending transactions found' });
    }

    // Update all transactions
    const updatePromises = transactions.map(async (transaction) => {
      transaction.confirmations.to = true;
      transaction.history.push({ 
        action: 'MARKED_RECEIVED', 
        amount: transaction.amount, 
        by: req.user.id 
      });
      
      // If the other person has also confirmed, mark as settled
      if (transaction.confirmations.from) {
        transaction.history.push({ 
          action: 'SETTLED', 
          amount: transaction.amount, 
          by: req.user.id 
        });
        transaction.amount = 0;
        transaction.status = 'settled';
        transaction.confirmations = { from: false, to: false };
      }
      
      return transaction.save();
    });

    await Promise.all(updatePromises);

    res.json({ 
      message: `Confirmed receipt for ${transactions.length} transaction(s)`,
      count: transactions.length
    });
  } catch (error) {
    console.error('Bulk confirm received error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { 
  listTransactionsByGroup, 
  confirmPaid, 
  confirmReceived,
  bulkConfirmPaid,
  bulkConfirmReceived
};