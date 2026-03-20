import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { OutlineEditor } from './pages/OutlineEditor';
import { DetailEditor } from './pages/DetailEditor';
import { SlidePreview } from './pages/SlidePreview';
import { SettingsPage } from './pages/Settings';
import { LoginPage } from './pages/Login';
import { HTMLRendererPage } from './experimental/html-renderer';
import { IntegratedPage } from './experimental/html-renderer/IntegratedPage';
import { useProjectStore } from './store/useProjectStore';
import { useToast } from './components/shared';
import { getAuthStatus, logoutAuth, type AuthStatus } from './api/endpoints';

const DEFAULT_AUTH_STATE: AuthStatus = {
  enabled: false,
  authenticated: true,
  user: null,
};

function App() {
  const { currentProject, syncProject, error, setError, setCurrentProject } = useProjectStore();
  const { show, ToastContainer } = useToast();
  const [authState, setAuthState] = useState<AuthStatus>(DEFAULT_AUTH_STATE);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const response = await getAuthStatus();
      const nextAuthState = response.data || DEFAULT_AUTH_STATE;
      setAuthState(nextAuthState);
    } catch (authError: any) {
      setAuthState(DEFAULT_AUTH_STATE);
      setError(authError?.message || '加载登录状态失败');
    } finally {
      setIsAuthLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (authState.enabled && !authState.authenticated) {
      localStorage.removeItem('currentProjectId');
      setCurrentProject(null);
    }
  }, [authState, setCurrentProject]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (authState.enabled && !authState.authenticated) {
      return;
    }

    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId && !currentProject) {
      syncProject();
    }
  }, [authState, currentProject, isAuthLoading, syncProject]);

  useEffect(() => {
    if (error) {
      show({ message: error, type: 'error' });
      setError(null);
    }
  }, [error, setError, show]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutAuth();
    } finally {
      localStorage.removeItem('currentProjectId');
      setCurrentProject(null);
      await refreshAuth();
    }
  }, [refreshAuth, setCurrentProject]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm text-slate-600">
        正在检查登录状态...
      </div>
    );
  }

  const requiresLogin = authState.enabled && !authState.authenticated;

  return (
    <BrowserRouter>
      {authState.enabled && authState.authenticated ? (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm shadow-lg shadow-slate-200/70 backdrop-blur">
          <span className="text-slate-600">当前账号</span>
          <span className="font-semibold text-slate-900">{authState.user?.username}</span>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            onClick={() => void handleLogout()}
          >
            退出登录
          </button>
        </div>
      ) : null}

      <Routes>
        {requiresLogin ? (
          <>
            <Route path="/login" element={<LoginPage onLoginSuccess={refreshAuth} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/project/:projectId/outline" element={<OutlineEditor />} />
            <Route path="/project/:projectId/detail" element={<DetailEditor />} />
            <Route path="/project/:projectId/preview" element={<SlidePreview />} />
            <Route path="/experimental/renderer" element={<HTMLRendererPage />} />
            <Route path="/experimental/integrated" element={<IntegratedPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
