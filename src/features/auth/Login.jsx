import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useRoles } from '@/hooks/useRoles';
import { db } from '@/db/schema';
import { audit } from '@/lib/audit';
import { ulid } from '@/lib/ids';

/**
 * Simulated login. Pick a role, type a name, drop in. No real auth — fully offline.
 */
export default function Login() {
  const navigate = useNavigate();
  const roles = useRoles();
  const login = useAuthStore((s) => s.login);
  const [name, setName] = useState('Operator');
  const [roleId, setRoleId] = useState(roles[0]?.id);

  useEffect(() => {
    if (!roleId && roles[0]) setRoleId(roles[0].id);
  }, [roles, roleId]);

  const submit = async (e) => {
    e.preventDefault();
    const user = {
      id: ulid(),
      name,
      email: `${name.toLowerCase().replace(/\W+/g, '.')}@atlantis.local`,
      roleId,
      createdAt: Date.now(),
    };
    await db.users.put(user);
    login(user);
    audit(user.id, 'login', null, { roleId });
    navigate('/');
  };

  return (
    <div className="h-full grid place-items-center bg-bg-base grid-bg">
      <div className="w-[440px] panel-elevated shadow-glow">
        <div className="px-3 py-2 border-b border-border-emphasis flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border border-accent-primary relative">
              <div className="absolute inset-0.5 bg-accent-primary/30" />
            </div>
            <span className="section-label text-text-primary">ATLANTIS // SIGN-IN</span>
          </div>
          <span className="text-micro tabular text-text-muted">OFFLINE BUILD</span>
        </div>

        <form onSubmit={submit} className="p-3 space-y-3">
          <div>
            <label className="section-label block mb-1">OPERATOR NAME</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="section-label block mb-1">ROLE</label>
            <div className="grid grid-cols-1 gap-1">
              {roles.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-2 px-2 py-1.5 border cursor-pointer transition-colors ${
                    roleId === r.id
                      ? 'border-accent-primary/60 bg-accent-primary/8'
                      : 'border-border-subtle hover:border-border-emphasis'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.id}
                    checked={roleId === r.id}
                    onChange={() => setRoleId(r.id)}
                    className="mt-0.5 accent-accent-primary"
                  />
                  <span className="flex-1">
                    <span className="block text-xs text-text-primary font-medium">
                      {r.name}
                      {!r.system && (
                        <span className="ml-1 chip text-viz-magenta border-viz-magenta/40">
                          custom
                        </span>
                      )}
                    </span>
                    <span className="block text-micro text-text-muted">{r.description}</span>
                  </span>
                  <span className="tabular text-micro text-text-muted">
                    {r.permissions.length} perm
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center pt-1">
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
              }}
              className="text-micro uppercase tracking-wider text-text-muted hover:text-accent-primary"
            >
              ⚙ Define a custom role
            </a>
            <button type="submit" className="btn btn-primary h-7 px-3">
              ENTER →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
