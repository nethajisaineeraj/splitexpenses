const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    amount: { type: Number, default: 0 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    pairKey: { type: String, required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
    confirmations: {
      from: { type: Boolean, default: false },
      to: { type: Boolean, default: false }
    },
    history: { type: [historySchema], default: [] },
    expenseId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Expense',
  default: null
},
expenseName: {
  type: String,
  default: ''
}
  },
  { timestamps: true }
);

transactionSchema.index({ group: 1, pairKey: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);
