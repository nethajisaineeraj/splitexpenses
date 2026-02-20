
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
};


// const formatDate = (date) => {
//   const d = new Date(date);
//   const day = String(d.getDate()).padStart(2, '0');
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const year = d.getFullYear();
//   return `₹{day}/₹{month}/₹{year}`;
// };

export default function TransactionList({ 
  transactions, 
  userId, 
  onConfirmPaid, 
  onConfirmReceived 
}) {
  if (!transactions || transactions.length === 0) {
    return <section className="card"><h3>Transactions</h3><p className="muted">No transactions yet.</p></section>;
  }

  return (
    <section className="card">
      <h3>Transactions</h3>
      {transactions.map((transaction) => (
        <div key={transaction._id} className="transaction-row">
          <div className="transaction-details">
            <div>
              {transaction.expenseName && (
                <div>Expense: {transaction.expenseName}</div>
              )}
              <div>{transaction.from?.name} owes {transaction.to?.name}: ₹{transaction.amount}</div>
              <div>{formatDate(transaction.createdAt)}</div>
            </div>
            <div className="transaction-info">
              <span>Status: {transaction.status}</span>
              {transaction.createdAt && (
                <span className="muted">
                  {' | ' + formatDate(transaction.createdAt)}
                </span>
              )}
              {transaction.status === 'settled' && (
                <span className="badge"> ✓ Settled</span>
              )}
            </div>
            {(transaction.confirmations?.from || transaction.confirmations?.to) && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#e8f5e9', borderRadius: '0.4rem', border: '1px solid #4caf50' }}>
                {transaction.confirmations?.from && (
                  <span style={{ display: 'inline-block', padding: '0.4rem 0.8rem', backgroundColor: '#4caf50', color: '#fff', borderRadius: '0.3rem', marginRight: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    ✓ Debtor Confirmed
                  </span>
                )}
                {transaction.confirmations?.to && (
                  <span style={{ display: 'inline-block', padding: '0.4rem 0.8rem', backgroundColor: '#2196f3', color: '#fff', borderRadius: '0.3rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    ✓ Creditor Confirmed
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="transaction-actions">
            {String(transaction.from?._id) === String(userId) && 
              !transaction.confirmations?.from && transaction.status !== 'settled' && (
              <button 
                onClick={() => onConfirmPaid(transaction._id)}
                className="btn-confirm"
              >
                Confirm Paid
              </button>
            )}
            {String(transaction.to?._id) === String(userId) && 
              !transaction.confirmations?.to && transaction.status !== 'settled' && (
              <button 
                onClick={() => onConfirmReceived(transaction._id)}
                className="btn-confirm"
              >
                Confirm Received
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
