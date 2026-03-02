/**
 * Admin page - Tenant & user management (super_admin + tenant_admin)
 */

import { useState, useEffect } from 'react';
import api from '../config/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';

const PLANS = ['free', 'starter', 'pro', 'enterprise'];

function TenantList({ tenants, onSelect, selected }) {
  return (
    <div className="space-y-2">
      {tenants.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          className={`w-full text-left p-3 rounded-lg border transition ${
            selected?.id === t.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-gray-800">{t.name}</p>
              <p className="text-xs text-gray-500">{t.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {t.is_active ? 'Actif' : 'Inactif'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {t.plan}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function UserList({ users, onDelete, onToggle }) {
  if (users.length === 0) {
    return <p className="text-sm text-gray-500 py-4">Aucun utilisateur.</p>;
  }
  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-800">
              {u.first_name} {u.last_name}
            </p>
            <p className="text-xs text-gray-500">{u.email}</p>
            <span className="text-xs text-gray-400">{u.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(u)}
              className={`text-xs px-2.5 py-1 rounded-lg ${
                u.is_active
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {u.is_active ? 'Desactiver' : 'Activer'}
            </button>
            <button
              onClick={() => onDelete(u)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateUserForm({ onSubmit, saving }) {
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', role: 'user',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({ email: '', password: '', firstName: '', lastName: '', role: 'user' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Prenom"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Nom"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Mot de passe"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
        minLength={8}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <select
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="user">Utilisateur</option>
        <option value="tenant_admin">Administrateur</option>
      </select>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary-600 px-4 py-2 text-white text-sm disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Spinner size="sm" className="text-white" />}
        Creer l'utilisateur
      </button>
    </form>
  );
}

export function Admin({ onBack }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load tenants (super_admin) or users (tenant_admin)
  useEffect(() => {
    if (isSuperAdmin) {
      loadTenants();
    } else {
      loadUsers();
    }
  }, []);

  const loadTenants = async () => {
    try {
      const { data } = await api.get('/tenants');
      setTenants(data.data.tenants || data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (tenantId) => {
    setLoadingUsers(true);
    try {
      const url = tenantId ? `/tenants/${tenantId}/users` : '/users';
      const { data } = await api.get(url);
      setUsers(data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectTenant = (tenant) => {
    setSelectedTenant(tenant);
    setShowUserForm(false);
    loadUsers(tenant.id);
  };

  const handleCreateUser = async (form) => {
    setSaving(true);
    setError('');
    try {
      const url = selectedTenant ? `/tenants/${selectedTenant.id}/users` : '/users';
      await api.post(url, form);
      setShowUserForm(false);
      loadUsers(selectedTenant?.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUser = async (u) => {
    try {
      const url = selectedTenant
        ? `/tenants/${selectedTenant.id}/users/${u.id}`
        : `/users/${u.id}`;
      await api.put(url, { is_active: !u.is_active });
      loadUsers(selectedTenant?.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!confirm(`Supprimer ${u.first_name} ${u.last_name}?`)) return;
    try {
      const url = selectedTenant
        ? `/tenants/${selectedTenant.id}/users/${u.id}`
        : `/users/${u.id}`;
      await api.delete(url);
      loadUsers(selectedTenant?.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateTenantPlan = async (tenant, plan) => {
    try {
      await api.put(`/tenants/${tenant.id}`, { plan });
      loadTenants();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleToggleTenant = async (tenant) => {
    try {
      await api.put(`/tenants/${tenant.id}`, { is_active: !tenant.is_active });
      loadTenants();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">
            {isSuperAdmin ? 'Administration' : 'Gestion des utilisateurs'}
          </h1>
          {onBack && (
            <button onClick={onBack} className="text-sm text-primary-600 hover:underline">
              Retour au chat
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm mb-4">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-red-500 font-bold">x</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : isSuperAdmin ? (
          /* ── Super Admin: tenants + users ─────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tenants list */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Tenants ({tenants.length})
              </h2>
              <TenantList
                tenants={tenants}
                onSelect={handleSelectTenant}
                selected={selectedTenant}
              />
            </div>

            {/* Selected tenant detail + users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {selectedTenant ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-700">
                      {selectedTenant.name}
                    </h2>
                    <button
                      onClick={() => handleToggleTenant(selectedTenant)}
                      className={`text-xs px-2.5 py-1 rounded-lg ${
                        selectedTenant.is_active
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {selectedTenant.is_active ? 'Desactiver' : 'Activer'}
                    </button>
                  </div>

                  {/* Plan selector */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1">Plan</label>
                    <div className="flex gap-1">
                      {PLANS.map((p) => (
                        <button
                          key={p}
                          onClick={() => handleUpdateTenantPlan(selectedTenant, p)}
                          className={`text-xs px-2.5 py-1 rounded-lg transition ${
                            selectedTenant.plan === p
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600">Utilisateurs</h3>
                    <button
                      onClick={() => setShowUserForm(!showUserForm)}
                      className="text-xs bg-primary-600 text-white rounded-lg px-3 py-1.5 hover:bg-primary-700"
                    >
                      + Ajouter
                    </button>
                  </div>

                  {showUserForm && (
                    <CreateUserForm onSubmit={handleCreateUser} saving={saving} />
                  )}

                  {loadingUsers ? (
                    <div className="flex justify-center py-6"><Spinner size="sm" /></div>
                  ) : (
                    <UserList
                      users={users}
                      onDelete={handleDeleteUser}
                      onToggle={handleToggleUser}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Selectionner un tenant pour voir ses utilisateurs.
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ── Tenant Admin: users only ─────────────── */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Utilisateurs</h2>
              <button
                onClick={() => setShowUserForm(!showUserForm)}
                className="text-xs bg-primary-600 text-white rounded-lg px-3 py-1.5 hover:bg-primary-700"
              >
                + Ajouter
              </button>
            </div>

            {showUserForm && (
              <CreateUserForm onSubmit={handleCreateUser} saving={saving} />
            )}

            {loadingUsers ? (
              <div className="flex justify-center py-6"><Spinner size="sm" /></div>
            ) : (
              <UserList
                users={users}
                onDelete={handleDeleteUser}
                onToggle={handleToggleUser}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
