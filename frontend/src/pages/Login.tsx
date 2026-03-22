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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#ede4d0' }}>
      <div className="w-full max-w-md rounded-lg bg-white p-8" style={{ border: '2px solid #1a1a1a', boxShadow: '8px 8px 0 #1a1a1a' }}>
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <img src="/yuean.svg" alt="跃案" className="h-7 w-auto rounded object-contain" />
            <p className="text-sm font-black text-gray-900">跃案</p>
          </div>
          <p className="text-xs text-gray-500 mb-2">智能教学课件平台</p>
          <h1 className="mt-3 text-3xl font-black text-gray-900">账号登录</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            登录后即可管理你的教学课件项目与资源。
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-700">账号</span>
            <input
              aria-label="账号"
              className="w-full rounded-md border-2 border-gray-900 px-4 py-3 text-gray-900 font-medium outline-none transition focus:border-gray-900"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-700">密码</span>
            <input
              aria-label="密码"
              type="password"
              className="w-full rounded-md border-2 border-gray-900 px-4 py-3 text-gray-900 font-medium outline-none transition focus:border-gray-900"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-md border-2 border-gray-900 bg-[#f5d040] px-4 py-3 text-sm font-black text-gray-900 transition hover:bg-[#f0c830] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0 #1a1a1a' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};
