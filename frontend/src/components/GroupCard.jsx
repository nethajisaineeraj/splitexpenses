import { Link } from 'react-router-dom';

export default function GroupCard({ group }) {
  return (
    <article className="card">
      <h3>{group.name}</h3>
      <p>{group.description || 'No description'}</p>
      <p className="muted">Admin: {group.admin?.name || 'N/A'}</p>
      <Link className="button" to={`/groups/${group._id}`}>
        Open Group
      </Link>
    </article>
  );
}
