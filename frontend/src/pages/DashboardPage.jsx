import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import GroupCard from '../components/GroupCard';

export default function DashboardPage() {
  const [groups, setGroups] = useState([]);
  const [totals, setTotals] = useState({ owed: 0, receive: 0 });
  const [oweToPeople, setOweToPeople] = useState([]);
  const [receiveFromPeople, setReceiveFromPeople] = useState([]);
  const [recent, setRecent] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [expandedOwe, setExpandedOwe] = useState(null);
  const [expandedReceive, setExpandedReceive] = useState(null);

  async function loadDashboard() {
    try {
      const [groupsRes, dashboardRes] = await Promise.all([api.get('/groups'), api.get('/groups/dashboard')]);
      setGroups(groupsRes.data.groups || []);
      setTotals(dashboardRes.data.totals || { owed: 0, receive: 0 });
      setOweToPeople(dashboardRes.data.oweToPeople || []);
      setReceiveFromPeople(dashboardRes.data.receiveFromPeople || []);
      setRecent(dashboardRes.data.recentActivity || []);
      console.log('Dashboard data:', dashboardRes.data);
      console.log('oweToPeople:', dashboardRes.data.oweToPeople);
      console.log('receiveFromPeople:', dashboardRes.data.receiveFromPeople);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function createGroup(e) {
    e.preventDefault();
    try {
      setError('');
      await api.post('/groups', form);
      setForm({ name: '', description: '' });
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    }
  }

  function getTxnFlags(txn, isOweList) {
    const confirmedByMe =
      txn.confirmedByMe ??
      (isOweList ? txn.confirmations?.from : txn.confirmations?.to);

    const confirmedByThem =
      txn.confirmedByThem ??
      (isOweList ? txn.confirmations?.to : txn.confirmations?.from);

    return { confirmedByMe, confirmedByThem };
  }

  return (
    <section className="grid-two">
      <div>
        {error && <p className="error">{error}</p>}

        <div className="stack-gap">
          <article className="card">
            <h2>Dashboard</h2>
            <p>Total Owed: {totals.owed}</p>
            <p>Total Receive: {totals.receive}</p>
          </article>

          {oweToPeople.length > 0 && (
            <div className="card">
              <h3>You Owe</h3>
              {oweToPeople.map((person) => (
                <div key={person.personId} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{person.name}</strong>
                      <p style={{ margin: '0.25rem 0', color: '#666' }}>Total: ₹{person.amount}</p>
                      <button
                        onClick={() => setExpandedOwe(expandedOwe === person.personId ? null : person.personId)}
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', marginTop: '0.5rem' }}
                      >
                        {expandedOwe === person.personId ? 'Hide' : 'Show'} {person.transactions.length} transaction(s)
                      </button>
                    </div>
                  </div>

                  {expandedOwe === person.personId && (
                    <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #4caf50' }}>
                      {person.transactions.map((txn) => {
                        const { confirmedByMe, confirmedByThem } = getTxnFlags(txn, true);
                        return (
                          <div key={txn.id} style={{ padding: '0.5rem', marginBottom: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '0.3rem' }}>
                            <p style={{ margin: 0 }}><strong>{txn.expenseName}</strong> - {txn.groupName}</p>
                            <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>Amount: ₹{txn.amount}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              {confirmedByMe && <span style={{ fontSize: '0.85rem', color: '#4caf50' }}>✓ You confirmed</span>}
                              {confirmedByThem && <span style={{ fontSize: '0.85rem', color: '#2196f3' }}>✓ They confirmed</span>}
                              {!confirmedByMe && !confirmedByThem && <span style={{ fontSize: '0.85rem', color: '#999' }}>Pending</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {receiveFromPeople.length > 0 && (
            <div className="card">
              <h3>You Receive</h3>
              {receiveFromPeople.map((person) => (
                <div key={person.personId} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{person.name}</strong>
                      <p style={{ margin: '0.25rem 0', color: '#666' }}>Total: ₹{person.amount}</p>
                      <button
                        onClick={() => setExpandedReceive(expandedReceive === person.personId ? null : person.personId)}
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem', marginTop: '0.5rem' }}
                      >
                        {expandedReceive === person.personId ? 'Hide' : 'Show'} {person.transactions.length} transaction(s)
                      </button>
                    </div>
                  </div>

                  {expandedReceive === person.personId && (
                    <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #2196f3' }}>
                      {person.transactions.map((txn) => {
                        const { confirmedByMe, confirmedByThem } = getTxnFlags(txn, false);
                        return (
                          <div key={txn.id} style={{ padding: '0.5rem', marginBottom: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '0.3rem' }}>
                            <p style={{ margin: 0 }}><strong>{txn.expenseName}</strong> - {txn.groupName}</p>
                            <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>Amount: ₹{txn.amount}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              {confirmedByMe && <span style={{ fontSize: '0.85rem', color: '#4caf50' }}>✓ You confirmed</span>}
                              {confirmedByThem && <span style={{ fontSize: '0.85rem', color: '#2196f3' }}>✓ They confirmed</span>}
                              {!confirmedByMe && !confirmedByThem && <span style={{ fontSize: '0.85rem', color: '#999' }}>Pending</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="card" onSubmit={createGroup}>
            <h3>Create Group</h3>
            <input
              placeholder="Group name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <button type="submit">Create</button>
          </form>
        </div>

        <h3>Your Groups</h3>
        <div className="list-gap">
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
          {groups.length === 0 && <p className="muted">No groups yet.</p>}
        </div>
      </div>

      <aside className="card">
        <h3>Recent Activity</h3>
        {recent.length === 0 && <p className="muted">No recent activity.</p>}
        {recent.map((item) => (
          <div key={item._id} className="activity-item">
            <strong>{item.description}</strong>
            <p className="muted">
              {item.group?.name} | {item.paidBy?.name} paid {item.amount}
            </p>
            <Link to={`/groups/${item.group?._id}`}>Open group</Link>
          </div>
        ))}
      </aside>
    </section>
  );
}