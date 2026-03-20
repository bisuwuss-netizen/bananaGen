import React, { useState } from 'react';
import { loginAuth } from '@/api/endpoints';

interface LoginPageProps {
  onLoginSuccess: () => Promise<void> | void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await loginAuth(username.trim(), password);
      await onLoginSuccess();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error?.message ||
        err?.message ||
        '登录失败';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/80">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">Banana Slides</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">账号登录</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            登录后只会看到当前账号自己的 PPT 项目和资源。
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">账号</span>
            <input
              aria-label="账号"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">密码</span>
            <input
              aria-label="密码"
              type="password"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};
