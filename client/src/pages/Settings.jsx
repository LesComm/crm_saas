/**
 * Settings page - CRM connection management
 * Supports two modes: API REST (HTTP) and MySQL direct database access
 */

import { useState, useEffect } from 'react';
import api from '../config/api.js';
import { Spinner } from '../components/ui/Spinner.jsx';

const DEFAULT_FORM = {
  label: 'Production',
  connectionMode: 'mysql',
  // API mode
  baseUrl: '',
  apiToken: '',
  // MySQL mode
  mysqlHost: '',
  mysqlPort: '3306',
  mysqlUser: '',
  mysqlPassword: '',
  mysqlDatabase: '',
};

export function Settings({ onBack }) {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [error, setError] = useState('');

  const loadCredentials = async () => {
    try {
      const { data } = await api.get('/credentials');
      setCredentials(data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCredentials(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/credentials', form);
      setShowForm(false);
      setForm({ ...DEFAULT_FORM });
      await loadCredentials();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const { data } = await api.post(`/credentials/${id}/test`);
      setCredentials((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data.data } : c))
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/credentials/${id}`);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleGenerateConfig = async (credentialId) => {
    try {
      await api.post('/ai-config/generate', { credentialId, autoActivate: true });
      setError('');
      alert('Configuration IA generee et activee!');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const isApiMode = form.connectionMode === 'api';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Parametres</h1>
          {onBack && (
            <button onClick={onBack} className="text-sm text-primary-600 hover:underline">
              Retour au chat
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm mb-4">
            {error}
          </div>
        )}

        {/* CRM Credentials */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Connexions CRM</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm bg-primary-600 text-white rounded-lg px-3 py-1.5 hover:bg-primary-700"
            >
              + Ajouter
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
              <input
                placeholder="Label (ex: Production)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />

              {/* Mode selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, connectionMode: 'mysql' })}
                  className={`flex-1 text-sm py-2 rounded-lg border transition ${
                    !isApiMode
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Base de donnees MySQL
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, connectionMode: 'api' })}
                  className={`flex-1 text-sm py-2 rounded-lg border transition ${
                    isApiMode
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  API REST
                </button>
              </div>

              {isApiMode ? (
                <>
                  <input
                    placeholder="URL Perfex CRM (https://crm.example.com)"
                    value={form.baseUrl}
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="API Token (authtoken)"
                    value={form.apiToken}
                    onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                    required
                    type="password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="Hote MySQL"
                      value={form.mysqlHost}
                      onChange={(e) => setForm({ ...form, mysqlHost: e.target.value })}
                      required
                      className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Port"
                      value={form.mysqlPort}
                      onChange={(e) => setForm({ ...form, mysqlPort: e.target.value })}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Utilisateur MySQL"
                      value={form.mysqlUser}
                      onChange={(e) => setForm({ ...form, mysqlUser: e.target.value })}
                      required
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Mot de passe"
                      value={form.mysqlPassword}
                      onChange={(e) => setForm({ ...form, mysqlPassword: e.target.value })}
                      required
                      type="password"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    placeholder="Base de donnees (ex: admin_gestioncrm)"
                    value={form.mysqlDatabase}
                    onChange={(e) => setForm({ ...form, mysqlDatabase: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary-600 px-4 py-2 text-white text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Spinner size="sm" className="text-white" />}
                Sauvegarder
              </button>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : credentials.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune connexion configuree.</p>
          ) : (
            <div className="space-y-3">
              {credentials.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{cred.label}</p>
                    <p className="text-xs text-gray-500">
                      {cred.connection_mode === 'mysql'
                        ? `MySQL: ${cred.mysql_user}@${cred.mysql_host}:${cred.mysql_port}/${cred.mysql_database}`
                        : cred.base_url}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cred.connection_mode === 'mysql'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {cred.connection_mode === 'mysql' ? 'MySQL' : 'API'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cred.connection_status === 'connected'
                          ? 'bg-green-100 text-green-700'
                          : cred.connection_status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {cred.connection_status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(cred.id)}
                      disabled={testing === cred.id}
                      className="text-xs bg-blue-100 text-blue-700 rounded-lg px-2.5 py-1 hover:bg-blue-200 disabled:opacity-50"
                    >
                      {testing === cred.id ? 'Test...' : 'Tester'}
                    </button>
                    {cred.connection_status === 'connected' && (
                      <button
                        onClick={() => handleGenerateConfig(cred.id)}
                        className="text-xs bg-green-100 text-green-700 rounded-lg px-2.5 py-1 hover:bg-green-200"
                      >
                        Configurer IA
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
