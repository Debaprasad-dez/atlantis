import { useState } from 'react';
import { Panel } from '@/components/primitives';
import { ALL_PERMISSIONS } from '@/lib/rbac';
import { useRoles } from '@/hooks/useRoles';
import { db } from '@/db/schema';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';
import { ulid } from '@/lib/ids';

/**
 * Admin / Roles screen with a full custom role builder.
 * Lets the user define a new role with any permission combination.
 */
export default function Admin() {
  const [refresh, setRefresh] = useState(0);
  const roles = useRoles(refresh);
  const user = useAuthStore((s) => s.user);
  const [draft, setDraft] = useState({ name: '', description: '', permissions: [] });
  const [editing, setEditing] = useState(null);

  const togglePerm = (p) =>
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(p)
        ? d.permissions.filter((x) => x !== p)
        : [...d.permissions, p],
    }));

  const saveRole = async () => {
    if (!draft.name.trim()) return;
    const role = editing
      ? { ...editing, ...draft }
      : { id: 'role_' + ulid().slice(-8), system: false, ...draft };
    await db.roles.put(role);
    audit(user?.id, editing ? 'edit_role' : 'create_role', role.id, {
      perms: role.permissions.length,
    });
    setDraft({ name: '', description: '', permissions: [] });
    setEditing(null);
    setRefresh((r) => r + 1);
  };

  const deleteRole = async (r) => {
    if (r.system) return;
    if (!confirm(`Delete role "${r.name}"?`)) return;
    await db.roles.delete(r.id);
    audit(user?.id, 'delete_role', r.id);
    setRefresh((r) => r + 1);
  };

  const editRole = (r) => {
    setEditing(r);
    setDraft({ name: r.name, description: r.description, permissions: [...r.permissions] });
  };

  const grouped = ALL_PERMISSIONS.reduce((m, p) => {
    (m[p.group] = m[p.group] || []).push(p);
    return m;
  }, {});

  return (
    <div className="h-full grid grid-cols-[420px,1fr] gap-1.5 p-1.5 bg-bg-base">
      <Panel
        header={
          <div className="flex items-center justify-between w-full">
            <span className="section-label">ROLES</span>
            <span className="tabular text-micro text-text-muted">{roles.length}</span>
          </div>
        }
      >
        <ul className="divide-y divide-border-subtle">
          {roles.map((r) => (
            <li
              key={r.id}
              className="px-2 py-1.5 hover:bg-bg-hover flex items-start gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-primary font-medium flex items-center gap-2">
                  {r.name}
                  {r.system ? (
                    <span className="chip text-text-muted">system</span>
                  ) : (
                    <span className="chip text-viz-magenta border-viz-magenta/40">custom</span>
                  )}
                </div>
                <div className="text-micro text-text-muted truncate">{r.description}</div>
                <div className="text-micro tabular text-text-faint mt-0.5">
                  {r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" className="btn h-6 px-2" onClick={() => editRole(r)}>
                  EDIT
                </button>
                {!r.system && (
                  <button
                    type="button"
                    className="btn btn-danger h-6 px-2"
                    onClick={() => deleteRole(r)}
                  >
                    DEL
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        header={
          <div className="flex items-center justify-between w-full">
            <span className="section-label">
              {editing ? `EDIT ROLE · ${editing.name}` : 'NEW ROLE'}
            </span>
            <div className="flex gap-1">
              {editing && (
                <button
                  type="button"
                  className="btn h-6 px-2"
                  onClick={() => {
                    setEditing(null);
                    setDraft({ name: '', description: '', permissions: [] });
                  }}
                >
                  CANCEL
                </button>
              )}
              <button type="button" className="btn btn-primary h-6 px-3" onClick={saveRole}>
                SAVE
              </button>
            </div>
          </div>
        }
      >
        <div className="p-3 space-y-3 overflow-auto h-full">
          <div className="grid grid-cols-[140px,1fr] gap-2 items-start">
            <label className="section-label pt-1.5">NAME</label>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Forensic Auditor"
            />
            <label className="section-label pt-1.5">DESCRIPTION</label>
            <input
              className="input"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What can this role do?"
            />
          </div>

          {Object.entries(grouped).map(([group, perms]) => (
            <div key={group} className="border border-border-subtle">
              <div className="section-label px-2 py-1.5 border-b border-border-subtle bg-bg-elevated flex items-center justify-between">
                <span>{group}</span>
                <span className="tabular text-text-muted">
                  {perms.filter((p) => draft.permissions.includes(p.key)).length}/{perms.length}
                </span>
              </div>
              <ul className="divide-y divide-border-subtle/60">
                {perms.map((p) => {
                  const on = draft.permissions.includes(p.key);
                  return (
                    <li
                      key={p.key}
                      onClick={() => togglePerm(p.key)}
                      className={`px-2 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-bg-hover ${
                        on ? 'bg-accent-primary/5' : ''
                      }`}
                    >
                      <span
                        className={`h-3 w-3 border ${
                          on
                            ? 'border-accent-primary bg-accent-primary/30'
                            : 'border-border-emphasis'
                        } grid place-items-center`}
                      >
                        {on && <span className="block h-1.5 w-1.5 bg-accent-primary" />}
                      </span>
                      <span className="text-xs text-text-primary flex-1">{p.label}</span>
                      <span className="tabular text-micro text-text-muted">{p.key}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
