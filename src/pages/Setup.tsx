import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Setup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkExisting() {
      try {
        const { data, error } = await supabase.rpc('has_gestionnaire');
        if (!error && data === true) {
          setAlreadyDone(true);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        }
      } catch {
        // RPC inexistante ou erreur reseau : on affiche le formulaire
      }
      setChecking(false);
    }
    checkExisting();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      setSubmitting(false);
      return;
    }

    // Verifier une derniere fois qu'aucun gestionnaire n'existe
    try {
      const { data: exists } = await supabase.rpc('has_gestionnaire');
      if (exists === true) {
        setAlreadyDone(true);
        setSubmitting(false);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }
    } catch {
      // RPC indisponible : on continue la creation
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { app_role: 'gestionnaire' },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    // Deconnecter immediatement pour ne pas rester connecte sur /setup
    await supabase.auth.signOut();

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => navigate('/login', { replace: true }), 3000);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#x26A0;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup deja effectue</h1>
          <p className="text-gray-500">Un compte gestionnaire existe deja. Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#x2714;</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte gestionnaire cree</h1>
          <p className="text-gray-500">Vous pouvez vous connecter. Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PlanningAuto</h1>
          <p className="text-gray-500 mt-2">Configuration initiale</p>
          <p className="text-sm text-gray-400 mt-1">Creez le premier compte gestionnaire</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email du gestionnaire
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="gestionnaire@example.fr"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="6 caracteres minimum"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? 'Creation...' : 'Creer le compte gestionnaire'}
          </button>
        </form>
      </div>
    </div>
  );
}
