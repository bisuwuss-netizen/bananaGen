import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { OutlineEditor } from './pages/OutlineEditor';
import { DetailEditor } from './pages/DetailEditor';
import { SlidePreview } from './pages/SlidePreview';
import { SettingsPage } from './pages/Settings';
import { HTMLRendererPage } from './experimental/html-renderer';
import { IntegratedPage } from './experimental/html-renderer/IntegratedPage';
import { useProjectStore } from './store/useProjectStore';
import { useToast } from './components/shared';
import { getCookie } from './utils';

function App() {
  const { currentProject, syncProject, error, setError } = useProjectStore();
  const { show, ToastContainer } = useToast();

  // 从 Cookie 获取 user_id 并设置到 localStorage
  useEffect(() => {
    const cookieUserId = getCookie('user_id');
    const storedUserId = localStorage.getItem('user_id');
    const resolvedUserId = cookieUserId || storedUserId || '1';

    if (!cookieUserId) {
      // 补写 Cookie，保证后端接口可以正确读取 user_id
      document.cookie = `user_id=${resolvedUserId}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }

    localStorage.setItem('user_id', resolvedUserId);
    console.log('当前 user_id:', resolvedUserId);
  }, []);

  // 恢复项目状态
  useEffect(() => {
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId && !currentProject) {
      syncProject();
    }
  }, [currentProject, syncProject]);

  // 显示全局错误
  useEffect(() => {
    if (error) {
      show({ message: error, type: 'error' });
      setError(null);
    }
  }, [error, setError, show]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/project/:projectId/outline" element={<OutlineEditor />} />
        <Route path="/project/:projectId/detail" element={<DetailEditor />} />
        <Route path="/project/:projectId/preview" element={<SlidePreview />} />
        {/* 实验性功能：HTML渲染器POC */}
        <Route path="/experimental/renderer" element={<HTMLRendererPage />} />
        <Route path="/experimental/integrated" element={<IntegratedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
      {/*<GithubLink />*/}
    </BrowserRouter>
  );
}

export default App;
