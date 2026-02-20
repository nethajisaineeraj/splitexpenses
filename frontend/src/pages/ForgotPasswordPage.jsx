import { useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { forgotPassword } = useAuth();

  async function submit(e) {
    e.preventDefault();
    try {
      setError('');
      const data = await forgotPassword(email);
      setMessage(`${data.message}${data.resetUrl ? ` Reset URL: ${data.resetUrl}` : ''}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate reset token');
    }
  }

  return (
    <section className="auth-card">
      <h2>Forgot Password</h2>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <form onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">Generate reset token</button>
      </form>
    </section>
  );
}
