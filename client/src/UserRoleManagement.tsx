import { useEffect, useState } from 'react';
import { assignUserRoles, createStaffAccount, managedRoles, managedUsers, type ManagedRole, type ManagedUser } from './api';
import './user-role-management.css';
import './staff-account.css';

const staffRoleNames = new Set(['teacher', 'bursar', 'registrar', 'admin', 'super_admin']);

export function UserRoleManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffDraft, setStaffDraft] = useState({ firstName: '', lastName: '', email: '', password: '', roleName: 'teacher' as 'teacher' | 'bursar' | 'registrar', employeeNumber: '', jobTitle: '', department: '', hireDate: '' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [userData, roleData] = await Promise.all([managedUsers(), managedRoles()]);
      setUsers(userData.users);
      setRoles(roleData.roles);
      setSelectedRoles(Object.fromEntries(userData.users.map((user) => [user._id, user.roleIds.map((role) => role._id)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load user roles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function updateRoleSelection(user: ManagedUser, role: ManagedRole, checked: boolean) {
    setNotice('');
    setSelectedRoles((current) => {
      const selected = current[user._id] ?? [];
      const selectedNames = roles.filter((item) => selected.includes(item._id)).map((item) => item.name);
      if (role.name === 'student' && checked && selectedNames.some((name) => staffRoleNames.has(name))) return current;
      if (staffRoleNames.has(role.name) && checked && selectedNames.includes('student')) return current;
      return { ...current, [user._id]: checked ? [...selected, role._id] : selected.filter((id) => id !== role._id) };
    });
  }

  async function saveRoles(user: ManagedUser) {
    const roleIds = selectedRoles[user._id] ?? [];
    if (!roleIds.length) {
      setError('Every account must have at least one role.');
      return;
    }
    setSavingId(user._id);
    setError('');
    setNotice('');
    try {
      await assignUserRoles(user._id, roleIds);
      setNotice(`Roles updated for ${user.firstName} ${user.lastName}.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update roles');
    } finally {
      setSavingId('');
    }
  }

  async function createStaff(event: React.FormEvent) {
    event.preventDefault();
    setCreatingStaff(true);
    setError('');
    setNotice('');
    try {
      await createStaffAccount({ ...staffDraft, ...(staffDraft.department ? {} : { department: undefined }), ...(staffDraft.hireDate ? {} : { hireDate: undefined }) });
      setNotice(`Staff account created for ${staffDraft.firstName} ${staffDraft.lastName}.`);
      setStaffDraft({ firstName: '', lastName: '', email: '', password: '', roleName: 'teacher', employeeNumber: '', jobTitle: '', department: '', hireDate: '' });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create staff account');
    } finally {
      setCreatingStaff(false);
    }
  }

  return <section className="user-role-management">
    <div className="role-management-heading"><div><small>ACCESS CONTROL</small><h2>Users &amp; roles</h2></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="role-management-notice" role="status">{notice}</p>}
    <section className="staff-account-section">
      <header><small>STAFF ACCOUNTS</small><h3>Add staff</h3></header>
      <form className="staff-account-form" onSubmit={createStaff}>
        <label>First name<input value={staffDraft.firstName} onChange={(event) => setStaffDraft((draft) => ({ ...draft, firstName: event.target.value }))} required /></label>
        <label>Surname<input value={staffDraft.lastName} onChange={(event) => setStaffDraft((draft) => ({ ...draft, lastName: event.target.value }))} required /></label>
        <label>Work email<input type="email" autoComplete="email" value={staffDraft.email} onChange={(event) => setStaffDraft((draft) => ({ ...draft, email: event.target.value }))} required /></label>
        <label>Temporary password<input type="password" minLength={8} autoComplete="new-password" value={staffDraft.password} onChange={(event) => setStaffDraft((draft) => ({ ...draft, password: event.target.value }))} required /></label>
        <label>Role<select value={staffDraft.roleName} onChange={(event) => setStaffDraft((draft) => ({ ...draft, roleName: event.target.value as 'teacher' | 'bursar' | 'registrar' }))}><option value="teacher">Teacher</option><option value="bursar">Bursar</option><option value="registrar">Registrar</option></select></label>
        <label>Employee number<input value={staffDraft.employeeNumber} onChange={(event) => setStaffDraft((draft) => ({ ...draft, employeeNumber: event.target.value }))} required /></label>
        <label>Job title<input value={staffDraft.jobTitle} onChange={(event) => setStaffDraft((draft) => ({ ...draft, jobTitle: event.target.value }))} required /></label>
        <label>Department<input value={staffDraft.department} onChange={(event) => setStaffDraft((draft) => ({ ...draft, department: event.target.value }))} /></label>
        <label>Hire date<input type="date" value={staffDraft.hireDate} onChange={(event) => setStaffDraft((draft) => ({ ...draft, hireDate: event.target.value }))} /></label>
        <button type="submit" disabled={creatingStaff}>{creatingStaff ? 'Creating...' : 'Create staff account'}</button>
      </form>
    </section>
    {loading ? <p className="muted" aria-live="polite">Loading users and roles...</p> : users.length === 0 ? <p className="muted">No accounts have been created yet.</p> : <div className="role-table-wrap"><table className="role-table"><thead><tr><th>Account</th><th>Current access</th><th>Assign roles</th><th></th></tr></thead><tbody>{users.map((user) => {
      const selected = selectedRoles[user._id] ?? [];
      const selectedNames = roles.filter((role) => selected.includes(role._id)).map((role) => role.name);
      return <tr key={user._id}>
        <td><strong>{user.firstName} {user.lastName}</strong><span>{user.loginCode ?? user.email}</span><small>{user.status}</small></td>
        <td>{user.roleIds.map((role) => role.name).join(', ')}</td>
        <td><div className="role-checkboxes">{roles.map((role) => {
          const isStudentConflict = role.name === 'student' && selectedNames.some((name) => staffRoleNames.has(name));
          const isStaffConflict = staffRoleNames.has(role.name) && selectedNames.includes('student');
          return <label key={role._id} title={role.permissions.length ? role.permissions.join(', ') : 'No permissions'}><input type="checkbox" checked={selected.includes(role._id)} disabled={savingId === user._id || (!selected.includes(role._id) && (isStudentConflict || isStaffConflict))} onChange={(event) => updateRoleSelection(user, role, event.target.checked)} />{role.name.replace(/_/g, ' ')}</label>;
        })}</div></td>
        <td><button type="button" disabled={savingId === user._id || selected.length === 0} onClick={() => void saveRoles(user)}>{savingId === user._id ? 'Saving...' : 'Save'}</button></td>
      </tr>;
    })}</tbody></table></div>}
  </section>;
}