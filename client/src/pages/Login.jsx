import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';

export function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    tenantName: '',
    tenantSlug: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSlugGenerate = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register({
          ...form,
          tenantSlug: form.tenantSlug || handleSlugGenerate(form.tenantName),
        });
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          CRM Assistant IA
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          {isRegister ? 'Creez votre compte' : 'Connectez-vous'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="firstName"
                  placeholder="Prenom"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  name="lastName"
                  placeholder="Nom"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <input
                name="tenantName"
                placeholder="Nom de l'entreprise"
                value={form.tenantName}
                onChange={(e) => {
                  handleChange(e);
                  setForm((f) => ({ ...f, tenantSlug: handleSlugGenerate(e.target.value) }));
                }}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </>
          )}

          <input
            name="email"
            type="email"
            placeholder="Adresse courriel"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" className="text-white" />}
            {isRegister ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isRegister ? 'Deja un compte?' : 'Pas encore de compte?'}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-primary-600 hover:underline font-medium"
          >
            {isRegister ? 'Se connecter' : "S'inscrire"}
          </button>
        </p>
      </div>
    </div>
  );
}
