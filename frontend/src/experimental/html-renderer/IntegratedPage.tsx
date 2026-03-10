/**
 * HTML渲染器集成页面
 * 完整流程：主题输入 → AI生成大纲 → AI生成内容 → 预览/导出
 */

import React, { useState, useRef, useEffect } from 'react';
import { PPTDocument, PagePayload, ThemeConfig } from './types/schema';
import { techBlueTheme } from './themes/tech-blue';
import { SlideRenderer } from './components/SlideRenderer';
import { getLayoutDisplayName, renderLayoutHTML } from './layouts';
import {
  generateHTMLDocument,
  downloadHTML,
  copyHTMLToClipboard,
  fileToBase64,
} from './utils/htmlExporter';
import {
  generateDocumentWithProgress,
  generateFullDocument,
  healthCheck,
} from './api/pptService';

// FontAwesome CDN
const FONTAWESOME_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export const IntegratedPage: React.FC = () => {
  // 输入状态
  const [topic, setTopic] = useState('');
  const [requirements, setRequirements] = useState('');

  // 生成状态
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // PPT数据
  const [pptDoc, setPptDoc] = useState<PPTDocument | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  // 其他状态
  const [theme] = useState<ThemeConfig>(techBlueTheme);
  const [copySuccess, setCopySuccess] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 注入FontAwesome
  useEffect(() => {
    const existingLink = window.document.querySelector(
      `link[href="${FONTAWESOME_CDN}"]`
    );
    if (!existingLink) {
      const link = window.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONTAWESOME_CDN;
      window.document.head.appendChild(link);
    }
  }, []);

  // 检查API可用性
  useEffect(() => {
    healthCheck().then(setApiAvailable);
  }, []);

  // 开始生成
  const _handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMessage('请输入PPT主题');
      return;
    }

    setStatus('generating');
    setProgress(0);
    setProgressMessage('准备中...');
    setErrorMessage('');

    try {
      const document = await generateDocumentWithProgress(
        topic.trim(),
        requirements.trim(),
        'zh',
        (current, total, message) => {
          setProgress(Math.round((current / total) * 100));
          setProgressMessage(message);
        }
      );

      setPptDoc(document as unknown as PPTDocument);
      setSelectedPageIndex(0);
      setStatus('success');
    } catch (error) {
      console.error('生成失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '生成失败，请重试');
      setStatus('error');
    }
  };

  // 快速生成（一键完成）
  const handleQuickGenerate = async () => {
    if (!topic.trim()) {
      setErrorMessage('请输入PPT主题');
      return;
    }

    setStatus('generating');
    setProgress(50);
    setProgressMessage('正在生成中...');
    setErrorMessage('');

    try {
      const document = await generateFullDocument(
        topic.trim(),
        requirements.trim(),
        'zh'
      );

      setPptDoc(document as unknown as PPTDocument);
      setSelectedPageIndex(0);
      setStatus('success');
      setProgress(100);
      setProgressMessage('生成完成！');
    } catch (error) {
      console.error('生成失败:', error);
      setErrorMessage(error instanceof Error ? error.message : '生成失败，请重试');
      setStatus('error');
    }
  };

  // 生成完整HTML
  const generateFullHTML = (): string => {
    if (!pptDoc) return '';
    const slidesHTML = pptDoc.pages.map((page) =>
      renderLayoutHTML(page.layout_id, page.model, theme)
    );
    return generateHTMLDocument(slidesHTML, theme, pptDoc);
  };

  // 下载HTML
  const handleDownloadHTML = () => {
    if (!pptDoc) return;
    const html = generateFullHTML();
    const filename = `${pptDoc.ppt_meta.title || 'presentation'}.html`;
    downloadHTML(html, filename);
  };

  // 复制HTML
  const handleCopyHTML = async () => {
    if (!pptDoc) return;
    const html = generateFullHTML();
    const success = await copyHTMLToClipboard(html);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // 图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pptDoc) return;

    try {
      const base64 = await fileToBase64(file);
      updatePageImage(base64);
    } catch (err) {
      console.error('图片上传失败:', err);
    }
  };

  // 更新页面图片
  const updatePageImage = (imageSrc: string) => {
    if (!pptDoc) return;

    const newPages = [...pptDoc.pages];
    const page = newPages[selectedPageIndex];
    const model = { ...page.model } as Record<string, unknown>;

    switch (page.layout_id) {
      case 'cover':
        model.background_image = imageSrc;
        break;
      case 'image_full':
        model.image_src = imageSrc;
        break;
      case 'two_column': {
        const left = model.left as Record<string, unknown> | undefined;
        const right = model.right as Record<string, unknown> | undefined;
        if (left?.type === 'image' && !left.image_src) {
          left.image_src = imageSrc;
        } else if (right?.type === 'image' && !right.image_src) {
          right.image_src = imageSrc;
        }
        break;
      }
      case 'title_content':
      case 'title_bullets':
      case 'process_steps': {
        const existingImage = model.image as Record<string, unknown> | undefined;
        if (!existingImage) {
          model.image = { src: imageSrc, position: 'right', width: '40%' };
        } else {
          existingImage.src = imageSrc;
        }
        break;
      }
      default:
        console.warn(`布局 ${page.layout_id} 不支持图片上传`);
        return;
    }

    newPages[selectedPageIndex] = {
      ...page,
      model: model as unknown as PagePayload['model'],
    } as typeof page;
    setPptDoc({ ...pptDoc, pages: newPages });
  };

  // 缩放比例
  const thumbnailScale = 0.12;
  const previewScale = 0.75;

  const selectedPage = pptDoc?.pages[selectedPageIndex];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#fff',
      }}
    >
      {/* 左侧面板 */}
      <div
        style={{
          width: '320px',
          backgroundColor: '#16213e',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #0f3460',
        }}
      >
        {/* 标题 */}
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#ed8936' }}>
          AI PPT 生成器
        </h2>

        {/* API状态 */}
        <div
          style={{
            marginBottom: '16px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor:
              apiAvailable === null
                ? '#2d4a6f'
                : apiAvailable
                ? '#2d6a4f'
                : '#6a2d2d',
            fontSize: '12px',
          }}
        >
          {apiAvailable === null
            ? '正在检查API连接...'
            : apiAvailable
            ? '后端API已连接'
            : '后端API未连接，请启动后端服务'}
        </div>

        {/* 输入区域 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '14px', color: '#a0a0a0', display: 'block', marginBottom: '8px' }}>
            PPT主题 *
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：3D建模入门教程"
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0d1b2a',
              border: '1px solid #2d4a6f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', color: '#a0a0a0', display: 'block', marginBottom: '8px' }}>
            额外要求（可选）
          </label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="例如：面向高职学生，需要包含实训环节"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0d1b2a',
              border: '1px solid #2d4a6f',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 生成按钮 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={handleQuickGenerate}
            disabled={status === 'generating' || !apiAvailable}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: status === 'generating' ? '#4a5568' : '#ed8936',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: status === 'generating' || !apiAvailable ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {status === 'generating' ? '生成中...' : '一键生成'}
          </button>
        </div>

        {/* 进度条 */}
        {status === 'generating' && (
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                height: '8px',
                backgroundColor: '#0d1b2a',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: '#ed8936',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#a0a0a0' }}>
              {progressMessage}
            </p>
          </div>
        )}

        {/* 错误信息 */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#6a2d2d',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* 缩略图列表 */}
        {pptDoc && (
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#a0a0a0' }}>
              幻灯片 ({pptDoc.pages.length})
            </h3>
            {pptDoc.pages.map((page, index) => (
              <div
                key={page.page_id}
                style={{
                  marginBottom: '10px',
                  cursor: 'pointer',
                  opacity: selectedPageIndex === index ? 1 : 0.7,
                }}
                onClick={() => setSelectedPageIndex(index)}
              >
                <div
                  style={{
                    width: theme.sizes.slideWidth * thumbnailScale,
                    height: theme.sizes.slideHeight * thumbnailScale,
                    overflow: 'hidden',
                    borderRadius: '4px',
                    border:
                      selectedPageIndex === index
                        ? '2px solid #ed8936'
                        : '2px solid transparent',
                  }}
                >
                  <SlideRenderer page={page} theme={theme} scale={thumbnailScale} />
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#a0a0a0' }}>
                  {index + 1}. {String(((page.model as unknown as Record<string, unknown>)?.title) || getLayoutDisplayName(page.layout_id))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 中间预览区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        {/* 工具栏 */}
        {pptDoc && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              {pptDoc.ppt_meta.title}
              <span style={{ color: '#a0a0a0', fontSize: '13px', marginLeft: '12px' }}>
                AI生成预览
              </span>
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#0f3460',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                上传图片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <button
                onClick={handleCopyHTML}
                style={{
                  padding: '8px 14px',
                  backgroundColor: copySuccess ? '#38a169' : '#0f3460',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {copySuccess ? '已复制!' : '复制HTML'}
              </button>
              <button
                onClick={handleDownloadHTML}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#ed8936',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                下载HTML
              </button>
            </div>
          </div>
        )}

        {/* 预览区域 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0d1b2a',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {pptDoc && selectedPage ? (
            <div
              style={{
                width: theme.sizes.slideWidth * previewScale,
                height: theme.sizes.slideHeight * previewScale,
                overflow: 'hidden',
              }}
            >
              <SlideRenderer
                page={selectedPage}
                theme={theme}
                scale={previewScale}
                isSelected={true}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#a0a0a0' }}>
              <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>🎨</p>
              <p style={{ fontSize: '16px' }}>输入主题，点击生成</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                AI将自动生成结构化PPT内容
              </p>
            </div>
          )}
        </div>

        {/* 页面导航 */}
        {pptDoc && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 16px',
              backgroundColor: '#0f3460',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#a0a0a0', fontSize: '13px' }}>
              第 {selectedPageIndex + 1} / {pptDoc.pages.length} 页 | 布局：
              <span style={{ color: '#ed8936' }}>{getLayoutDisplayName(selectedPage?.layout_id)}</span>
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedPageIndex(Math.max(0, selectedPageIndex - 1))}
                disabled={selectedPageIndex === 0}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedPageIndex === 0 ? '#1a1a2e' : '#2d4a6f',
                  color: selectedPageIndex === 0 ? '#666' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedPageIndex === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                上一页
              </button>
              <button
                onClick={() =>
                  setSelectedPageIndex(
                    Math.min(pptDoc.pages.length - 1, selectedPageIndex + 1)
                  )
                }
                disabled={selectedPageIndex === pptDoc.pages.length - 1}
                style={{
                  padding: '6px 12px',
                  backgroundColor:
                    selectedPageIndex === pptDoc.pages.length - 1 ? '#1a1a2e' : '#2d4a6f',
                  color: selectedPageIndex === pptDoc.pages.length - 1 ? '#666' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor:
                    selectedPageIndex === pptDoc.pages.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 右侧信息面板 */}
      {pptDoc && selectedPage && (
        <div
          style={{
            width: '260px',
            backgroundColor: '#16213e',
            padding: '16px',
            borderLeft: '1px solid #0f3460',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#a0a0a0' }}>
            页面属性
          </h3>
          <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#a0a0a0' }}>页面ID：</span>
              <span style={{ color: '#fff' }}>{selectedPage.page_id}</span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#a0a0a0' }}>布局类型：</span>
              <span style={{ color: '#ed8936' }}>{getLayoutDisplayName(selectedPage.layout_id)}</span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#a0a0a0' }}>排序索引：</span>
              <span style={{ color: '#fff' }}>{selectedPage.order_index}</span>
            </div>
          </div>

          <h3 style={{ margin: '20px 0 12px 0', fontSize: '14px', color: '#a0a0a0' }}>
            当前页Model
          </h3>
          <pre
            style={{
              backgroundColor: '#0d1b2a',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '10px',
              overflow: 'auto',
              maxHeight: '300px',
              color: '#a0a0a0',
            }}
          >
            {JSON.stringify(selectedPage.model, null, 2)}
          </pre>

          <h3 style={{ margin: '20px 0 12px 0', fontSize: '14px', color: '#a0a0a0' }}>
            使用说明
          </h3>
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 16px',
              fontSize: '11px',
              color: '#a0a0a0',
              lineHeight: '1.8',
            }}
          >
            <li>输入主题点击"一键生成"</li>
            <li>点击左侧缩略图切换页面</li>
            <li>点击"上传图片"为当前页添加图片</li>
            <li>点击"下载HTML"导出完整文档</li>
            <li>导出的HTML可用于转换PPT</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default IntegratedPage;
