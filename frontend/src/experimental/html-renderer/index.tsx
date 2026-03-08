/**
 * HTML渲染器POC预览页面
 * 独立的实验性功能入口
 */

import React, { useState, useRef, useEffect } from 'react';
import { PPTDocument, ThemeConfig } from './types/schema';
import { techBlueTheme } from './themes/tech-blue';
import { SlideRenderer } from './components/SlideRenderer';
import { getLayoutDisplayName, renderLayoutHTML } from './layouts';
import { generateHTMLDocument, downloadHTML, copyHTMLToClipboard, fileToBase64 } from './utils/htmlExporter';
import samplePPT from './mock-data/sample-ppt.json';

// FontAwesome CDN（页面加载时注入）
const FONTAWESOME_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';

export const HTMLRendererPage: React.FC = () => {
  const [pptDoc, setPptDoc] = useState<PPTDocument>(samplePPT as PPTDocument);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [theme] = useState<ThemeConfig>(techBlueTheme);
  const [copySuccess, setCopySuccess] = useState(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 注入FontAwesome
  useEffect(() => {
    const existingLink = window.document.querySelector(`link[href="${FONTAWESOME_CDN}"]`);
    if (!existingLink) {
      const link = window.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONTAWESOME_CDN;
      window.document.head.appendChild(link);
    }
  }, []);

  const selectedPage = pptDoc.pages[selectedPageIndex];

  // 生成完整HTML
  const generateFullHTML = (): string => {
    const slidesHTML = pptDoc.pages.map((page) =>
      renderLayoutHTML(page.layout_id, page.model, theme)
    );
    return generateHTMLDocument(slidesHTML, theme, pptDoc);
  };

  // 下载HTML
  const handleDownloadHTML = () => {
    const html = generateFullHTML();
    const filename = `${pptDoc.ppt_meta.title || 'presentation'}.html`;
    downloadHTML(html, filename);
  };

  // 复制HTML到剪贴板
  const handleCopyHTML = async () => {
    const html = generateFullHTML();
    const success = await copyHTMLToClipboard(html);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // 加载自定义JSON
  const handleLoadJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setPptDoc(parsed as PPTDocument);
      setSelectedPageIndex(0);
      setShowJsonEditor(false);
      setJsonInput('');
    } catch (e) {
      alert('JSON解析失败，请检查格式');
    }
  };

  // 图片上传处理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      // 更新当前页面的图片
      updatePageImage(base64);
    } catch (err) {
      console.error('图片上传失败:', err);
    }
  };

  // 更新页面图片（根据布局类型）
  const updatePageImage = (imageSrc: string) => {
    const newPages = [...pptDoc.pages];
    const page = newPages[selectedPageIndex];
    const model = { ...page.model } as any;

    // 根据布局类型更新不同的图片字段
    switch (page.layout_id) {
      case 'cover':
        model.background_image = imageSrc;
        break;
      case 'image_full':
        model.image_src = imageSrc;
        break;
      case 'two_column':
        // 更新第一个空的图片位置
        if (model.left?.type === 'image' && !model.left.image_src) {
          model.left.image_src = imageSrc;
        } else if (model.right?.type === 'image' && !model.right.image_src) {
          model.right.image_src = imageSrc;
        }
        break;
      // 新增支持的布局类型
      case 'title_content':
      case 'title_bullets':
      case 'process_steps':
        if (!model.image) {
          model.image = { src: imageSrc, position: 'right', width: '40%' };
        } else {
          model.image.src = imageSrc;
        }
        break;
      default:
        console.warn(`布局 ${page.layout_id} 不支持图片上传`);
        return;
    }

    newPages[selectedPageIndex] = { ...page, model };
    setPptDoc({ ...pptDoc, pages: newPages });
  };

  // 计算缩略图缩放比例
  const thumbnailScale = 0.15;
  const previewScale = 0.85;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1a1a2e', color: '#fff' }}>
      {/* 左侧缩略图列表 */}
      <div
        style={{
          width: '240px',
          backgroundColor: '#16213e',
          padding: '16px',
          overflowY: 'auto',
          borderRight: '1px solid #0f3460',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#a0a0a0' }}>
          幻灯片 ({pptDoc.pages.length})
        </h3>
        {pptDoc.pages.map((page, index) => (
          <div
            key={page.page_id}
            style={{
              marginBottom: '12px',
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
                border: selectedPageIndex === index ? '2px solid #ed8936' : '2px solid transparent',
              }}
            >
              <SlideRenderer page={page} theme={theme} scale={thumbnailScale} />
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#a0a0a0' }}>
              {index + 1}. {(page.model as any).title || getLayoutDisplayName(page.layout_id)}
            </p>
          </div>
        ))}
      </div>

      {/* 中间预览区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
        {/* 工具栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            {pptDoc.ppt_meta.title}
            <span style={{ color: '#a0a0a0', fontSize: '14px', marginLeft: '12px' }}>
              HTML渲染器 POC
            </span>
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowJsonEditor(!showJsonEditor)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0f3460',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {showJsonEditor ? '关闭编辑器' : '加载JSON'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0f3460',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
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
                padding: '8px 16px',
                backgroundColor: copySuccess ? '#38a169' : '#0f3460',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? '已复制!' : '复制HTML'}
            </button>
            <button
              onClick={handleDownloadHTML}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ed8936',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              下载HTML
            </button>
          </div>
        </div>

        {/* JSON编辑器 */}
        {showJsonEditor && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#0f3460',
              borderRadius: '8px',
            }}
          >
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="粘贴JSON数据..."
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                backgroundColor: '#1a1a2e',
                color: '#fff',
                border: '1px solid #2d4a6f',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical',
              }}
            />
            <button
              onClick={handleLoadJSON}
              style={{
                marginTop: '12px',
                padding: '8px 24px',
                backgroundColor: '#38a169',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              应用JSON
            </button>
          </div>
        )}

        {/* 幻灯片预览 */}
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
        </div>

        {/* 页面信息 */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#0f3460',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#a0a0a0', fontSize: '14px' }}>
            第 {selectedPageIndex + 1} / {pptDoc.pages.length} 页 | 布局：
            <span style={{ color: '#ed8936' }}>{getLayoutDisplayName(selectedPage.layout_id)}</span>
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
              }}
            >
              上一页
            </button>
            <button
              onClick={() =>
                setSelectedPageIndex(Math.min(pptDoc.pages.length - 1, selectedPageIndex + 1))
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
              }}
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 右侧信息面板 */}
      <div
        style={{
          width: '280px',
          backgroundColor: '#16213e',
          padding: '16px',
          borderLeft: '1px solid #0f3460',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#a0a0a0' }}>页面属性</h3>
        <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: '#a0a0a0' }}>页面ID：</span>
            <span style={{ color: '#fff' }}>{selectedPage.page_id}</span>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: '#a0a0a0' }}>布局类型：</span>
            <span style={{ color: '#ed8936' }}>{getLayoutDisplayName(selectedPage.layout_id)}</span>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: '#a0a0a0' }}>排序索引：</span>
            <span style={{ color: '#fff' }}>{selectedPage.order_index}</span>
          </div>
        </div>

        <h3 style={{ margin: '24px 0 16px 0', fontSize: '14px', color: '#a0a0a0' }}>
          当前页Model
        </h3>
        <pre
          style={{
            backgroundColor: '#0d1b2a',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '400px',
            color: '#a0a0a0',
          }}
        >
          {JSON.stringify(selectedPage.model, null, 2)}
        </pre>

        <h3 style={{ margin: '24px 0 16px 0', fontSize: '14px', color: '#a0a0a0' }}>使用说明</h3>
        <ul
          style={{
            margin: 0,
            padding: '0 0 0 16px',
            fontSize: '12px',
            color: '#a0a0a0',
            lineHeight: '1.8',
          }}
        >
          <li>点击左侧缩略图切换页面</li>
          <li>点击"加载JSON"可导入自定义数据</li>
          <li>点击"上传图片"为当前页添加图片</li>
          <li>点击"下载HTML"导出完整文档</li>
          <li>导出的HTML可直接用于转换PPT</li>
        </ul>
      </div>
    </div>
  );
};

export default HTMLRendererPage;
