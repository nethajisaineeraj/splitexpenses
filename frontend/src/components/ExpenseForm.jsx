import { useEffect, useState } from 'react';

const emptyState = {
  description: '',
  amount: '',
  paidBy: '',
  splitType: 'equal',
  participants: []
};

export default function ExpenseForm({ members, initialValue, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialValue || emptyState);

  useEffect(() => {
    setForm(initialValue || emptyState);
  }, [initialValue]);

  function handleToggleParticipant(userId, checked) {
    if (checked) {
      setForm((prev) => ({
        ...prev,
        participants: [...prev.participants, { user: userId, amount: 0, percentage: 0 }]
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      participants: prev.participants.filter((p) => p.user !== userId)
    }));
  }

  function handleParticipantField(userId, field, value) {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.user === userId ? { ...p, [field]: value === '' ? '' : Number(value) } : p
      )
    }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: Number(form.amount),
      participants: form.participants.map((p) => ({
        user: p.user,
        amount: Number(p.amount || 0),
        percentage: Number(p.percentage || 0)
      }))
    });

    if (!initialValue) {
      setForm(emptyState);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>{initialValue ? 'Edit Expense' : 'Add Expense'}</h3>
      <input
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        required
      />
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Amount"
        value={form.amount}
        onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
        required
      />
      <label>Paid By</label>
      <select value={form.paidBy} onChange={(e) => setForm((prev) => ({ ...prev, paidBy: e.target.value }))} required>
        <option value="">Select payer</option>
        {members.map((member) => (
          <option key={member._id} value={member._id}>
            {member.name}
          </option>
        ))}
      </select>
      <label>Split Type</label>
      <select value={form.splitType} onChange={(e) => setForm((prev) => ({ ...prev, splitType: e.target.value }))}>
        <option value="equal">Equal</option>
        <option value="custom">Custom</option>
        <option value="percentage">Percentage</option>
      </select>

      <div>
        <strong>Participants</strong>
        {members.map((member) => {
          const selected = form.participants.some((p) => p.user === member._id);
          const current = form.participants.find((p) => p.user === member._id) || { amount: '', percentage: '' };
          return (
            <div key={member._id} className="participant-row">
              <label>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => handleToggleParticipant(member._id, e.target.checked)}
                />
                {member.name}
              </label>
              {selected && form.splitType === 'custom' && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={current.amount}
                  onChange={(e) => handleParticipantField(member._id, 'amount', e.target.value)}
                />
              )}
              {selected && form.splitType === 'percentage' && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="%"
                  value={current.percentage}
                  onChange={(e) => handleParticipantField(member._id, 'percentage', e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="row">
        <button type="submit">{initialValue ? 'Update Expense' : 'Add Expense'}</button>
        {initialValue && (
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
