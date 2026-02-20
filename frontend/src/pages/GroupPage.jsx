import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import useAuth from '../hooks/useAuth';
import ExpenseForm from '../components/ExpenseForm';
import TransactionList from '../components/TransactionList';
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


export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [editExpense, setEditExpense] = useState(null);
  const [error, setError] = useState('');

  const isAdmin = useMemo(() => String(group?.admin?._id || group?.admin) === String(user?.id), [group, user]);

  // async function load() {
  //   try {
  //     const [groupRes, expenseRes, transactionRes] = await Promise.all([
  //       api.get(`/groups/${groupId}`),
  //       api.get(`/groups/${groupId}/expenses`),
  //       api.get(`/groups/${groupId}/transactions`)
  //     ]);
  //     setGroup(groupRes.data.group);
  //     setExpenses(expenseRes.data.expenses || []);
  //     setTransactions(transactionRes.data.transactions || []);
  //   } catch (err) {
  //     setError(err.response?.data?.message || 'Failed to load group');
  //   }
  // }

  async function load() {
  try {
    setError('');
    console.log('Loading group:', groupId);
    
    const groupRes = await api.get(`/groups/${groupId}`);
    console.log('Group loaded:', groupRes.data);
    setGroup(groupRes.data.group);

    const expenseRes = await api.get(`/groups/${groupId}/expenses`);
    console.log('Expenses loaded:', expenseRes.data);
    setExpenses(expenseRes.data.expenses || []);

    const transactionRes = await api.get(`/groups/${groupId}/transactions`);
    console.log('Transactions loaded:', transactionRes.data);
    setTransactions(transactionRes.data.transactions || []);
  } catch (err) {
    console.error('Load error:', err);
    setError(err.response?.data?.message || err.message || 'Failed to load group');
  }
}

  useEffect(() => {
    load();
  }, [groupId]);

  async function addMember(e) {
    e.preventDefault();
    try {
      await api.post(`/groups/${groupId}/members`, { email: memberEmail });
      setMemberEmail('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    }
  }

  async function removeMember(memberId) {
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  }

  async function leaveGroup() {
    try {
      await api.post(`/groups/${groupId}/leave`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave group');
    }
  }

  async function deleteGroup() {
    try {
      await api.delete(`/groups/${groupId}`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete group');
    }
  }

  async function makeAdmin(memberId) {
    try {
      await api.patch(`/groups/${groupId}/admin`, { newAdminId: memberId });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to make admin');
    }
  }

  async function createExpense(payload) {
    try {
      await api.post(`/groups/${groupId}/expenses`, payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    }
  }

  async function updateExpense(payload) {
    try {
      await api.put(`/groups/${groupId}/expenses/${editExpense._id}`, payload);
      setEditExpense(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update expense');
    }
  }

  async function deleteExpense(expenseId) {
    try {
      await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense');
    }
  }

  // async function confirmPaid(transactionId) {
  //   try {
  //     try {
  //       await api.patch(`/transactions/${transactionId}/confirm-paid`);
  //     } catch (err) {
  //       console.error('Confirm paid error:', err);
  //       setError(err.response?.data?.message || 'Failed to confirm payment');
  //     }
  //   } finally {
  //     try {
  //       await load();
  //     } catch (err) {
  //       console.error('Load error after confirm paid:', err);
  //       setError(err.response?.data?.message || 'Failed to reload data');
  //     }
  //   }
  // }

  // async function confirmReceived(transactionId) {
  //   try {
  //     try {
  //       await api.patch(`/transactions/${transactionId}/confirm-received`);
  //     } catch (err) {
  //       console.error('Confirm received error:', err);
  //       setError(err.response?.data?.message || 'Failed to confirm receipt');
  //     }
  //   } finally {
  //     try {
  //       await load();
  //     } catch (err) {
  //       console.error('Load error after confirm received:', err);
  //       setError(err.response?.data?.message || 'Failed to reload data');
  //     }
  //   }
  // }

async function confirmPaid(transactionId) {
  try {
    const response = await api.patch(`/transactions/${transactionId}/confirm-paid`);
    console.log('Confirm paid response:', response);
    
    try {
      await load();
    } catch (loadErr) {
      console.error('Load error after confirm paid:', loadErr);
      if (response.data?.transaction) {
        setTransactions(prevTransactions =>
          prevTransactions.map(t => t._id === transactionId ? response.data.transaction : t)
        );
        console.log('Fallback: Updated transaction in local state');
      }
      setError(loadErr.response?.data?.message || 'Failed to reload data');
    }
  } catch (err) {
    console.error('Confirm paid error:', err);
    setError(err.response?.data?.message || 'Failed to confirm payment');
  }
}

async function confirmReceived(transactionId) {
  try {
    const response = await api.patch(`/transactions/${transactionId}/confirm-received`);
    console.log('Confirm received response:', response);
    
    try {
      await load();
    } catch (loadErr) {
      console.error('Load error after confirm received:', loadErr);
      if (response.data?.transaction) {
        setTransactions(prevTransactions =>
          prevTransactions.map(t => t._id === transactionId ? response.data.transaction : t)
        );
        console.log('Fallback: Updated transaction in local state');
      }
      setError(loadErr.response?.data?.message || 'Failed to reload data');
    }
  } catch (err) {
    console.error('Confirm received error:', err);
    setError(err.response?.data?.message || 'Failed to confirm receipt');
  }
}

  if (!group) return <p>Loading group...</p>;

  return (
    <section className="list-gap">
      {error && <p className="error">{error}</p>}
      <article className="card">
        <h2>{group.name}</h2>
        <p>{group.description || 'No description'}</p>
        <p className="muted">Admin: {group.admin?.name}</p>
        {isAdmin ? (
          <button className="button-danger" onClick={deleteGroup}>
            Delete Group
          </button>
        ) : (
          <button className="button-secondary" onClick={leaveGroup}>
            Leave Group
          </button>
        )}
      </article>

      <article className="card">
        <h3>Members</h3>
        {isAdmin && (
          <form className="row" onSubmit={addMember}>
            <input
              type="email"
              placeholder="Invite by email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              required
            />
            <button type="submit">Add</button>
          </form>
        )}
        {group.members.map((member) => (
          <div className="member-row" key={member._id}>
            <span>
              {member.name} ({member.email})
            </span>
            {isAdmin && String(member._id) !== String(group.admin?._id || group.admin) && (
              <div className="row">
                <button className="button" onClick={() => makeAdmin(member._id)}>
                  Make Admin
                </button>
                <button className="button-secondary" onClick={() => removeMember(member._id)}>
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </article>

      <ExpenseForm
        members={group.members}
        initialValue={
          editExpense
            ? {
                description: editExpense.description,
                amount: editExpense.amount,
                paidBy: editExpense.paidBy?._id || editExpense.paidBy,
                splitType: editExpense.splitType,
                participants: editExpense.participants.map((p) => ({
                  user: p.user?._id || p.user,
                  amount: p.amount,
                  percentage: p.percentage
                }))
              }
            : {
                description: '',
                amount: '',
                paidBy: group.members[0]?._id || '',
                splitType: 'equal',
                participants: group.members.map((m) => ({ user: m._id, amount: 0, percentage: 0 }))
              }
        }
        onSubmit={editExpense ? updateExpense : createExpense}
        onCancel={() => setEditExpense(null)}
      />

      <section className="card">
        <h3>Expenses</h3>
        <div className="section-scroll">
          {expenses.length === 0 && <p className="muted">No expenses yet.</p>}
          {expenses.map((expense) => (
            <div key={expense._id} className="expense-row">
              <div>
                <strong>{expense.description}</strong>
                <p className="muted">
                  Amount: {expense.amount} | Paid by: {expense.paidBy?.name}
                </p>
                {formatDate(expense.createdAt) && (
                  <p className="muted" style={{ fontSize: '0.85em' }}>
                    {formatDate(expense.createdAt)}
                  </p>
                )}
              </div>
              <div className="row">
                <button onClick={() => setEditExpense(expense)}>Edit</button>
                <button className="button-secondary" onClick={() => deleteExpense(expense._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-scroll">
        <TransactionList
          transactions={transactions}
          userId={user.id}
          onConfirmPaid={confirmPaid}
          onConfirmReceived={confirmReceived}
        />
      </div>
    </section>
  );
}
