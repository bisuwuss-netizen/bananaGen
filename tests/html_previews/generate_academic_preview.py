import os
import sys

# 添加 backend 到系统路径以导入代码
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.append(backend_path)

# from services.prompts.schemas import LAYOUT_SCHEMAS

# 定制的学术风 CSS 和 HTML 骨架
HTML_SKELETON = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Theme Previews</title>
    <!-- 引入数学公式字体支持 -->
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,700;1,400&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
    <!-- 引入 MathJax 渲染 LaTeX -->
    <script>
        MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']]
          }
        };
    </script>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>
        body {
            background-color: #e9ecef;
            margin: 0;
            padding: 40px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 40px;
        }
        h1 {
            color: #2c3e50;
            font-family: 'Playfair Display', serif;
        }
        .slide-container {
            width: 1280px;
            height: 720px;
            flex-shrink: 0;
            background: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border-radius: 4px;
        }
        .slide-label {
            position: absolute;
            top: -30px;
            left: 0;
            color: #555;
            font-weight: bold;
            font-size: 14px;
        }
        .slide-wrapper {
            position: relative;
        }
        
        /* === 模拟前端渲染引擎的 CSS 类与样式 === */
        
        /* 封面页 cover_academic (mapped to cover) */
        .academic-cover {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            height: 100%;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: white;
            font-family: 'Playfair Display', serif;
        }
        .academic-cover h1 {
            color: white;
            font-size: 64px;
            margin-bottom: 20px;
            letter-spacing: 2px;
        }
        .academic-cover .author-info {
            font-family: 'Crimson Pro', serif;
            font-size: 24px;
            color: #cbd5e1;
            margin-top: 50px;
            border-top: 1px solid rgba(255,255,255,0.2);
            padding-top: 20px;
        }

        /* 学习目标页 learning_objectives */
        .lo-layout {
            padding: 60px;
            background-color: #f8f9fa;
            height: 100%;
            box-sizing: border-box;
            font-family: 'Crimson Pro', serif;
        }
        .lo-header {
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 16px;
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .lo-title {
            font-size: 44px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
            font-family: 'Playfair Display', serif;
        }
        .lo-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
        }
        .lo-card {
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            display: flex;
            flex-direction: column;
        }
        
        /* 理论推导页 theory_explanation */
        .te-layout {
            padding: 60px;
            background-color: #f8f9fa;
            height: 100%;
            box-sizing: border-box;
            font-family: 'Crimson Pro', serif;
        }
        .te-content {
            display: flex;
            gap: 40px;
            height: calc(100% - 150px);
        }
        .te-left {
            flex: 1.2;
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding-right: 40px;
            border-right: 1px solid #bdc3c7;
        }
        .te-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 24px;
            justify-content: center;
        }
        .te-formula-card {
            background-color: #ffffff;
            border: 1px solid #ecf0f1;
            padding: 24px;
            border-radius: 4px;
            text-align: center;
        }
        .te-latex {
            font-size: 24px;
            font-family: 'Times New Roman', serif;
            font-style: italic;
            color: #2c3e50;
            padding: 20px;
            background-color: #fbfcfc;
            border: 1px solid #e0e0e0;
        }

        /* 目录页 toc_academic */
        .academic-toc {
            padding: 60px;
            background-color: #ffffff;
            height: 100%;
            box-sizing: border-box;
            font-family: 'Crimson Pro', serif;
        }
        .toc-list {
            margin-top: 50px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .toc-item {
            display: flex;
            align-items: baseline;
            border-bottom: 1px dotted #cbd5e1;
            padding-bottom: 10px;
            font-size: 28px;
            color: #334155;
        }
        .toc-item span:first-child {
            font-weight: bold;
            color: #0f172a;
            margin-right: 30px;
            font-family: 'Playfair Display', serif;
        }

        /* 核心概念 title_bullets */
        .academic-bullets {
            padding: 60px;
            background-color: #ffffff;
            height: 100%;
            box-sizing: border-box;
            font-family: 'Crimson Pro', serif;
        }
        .bullet-item {
            display: flex;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-left: 4px solid #64748b;
        }
        .bullet-title {
            font-weight: bold;
            font-size: 24px;
            color: #0f172a;
            width: 200px;
            flex-shrink: 0;
            font-family: 'Playfair Display', serif;
        }
        .bullet-desc {
            font-size: 20px;
            color: #475569;
            line-height: 1.6;
        }
        
    </style>
</head>
<body>
    <h1>学术严谨型 (Academic) - 布局组件画廊直览</h1>
"""

# HTML 片段构建函数
def generate_cover_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">cover_academic (封面页)</div>
        <div class="slide-container academic-cover">
            <h1>基于Transformer架构的大语言模型推理优化机理研究</h1>
            <p style="font-size: 28px; color: #94a3b8; font-family: 'Crimson Pro', serif; margin: 0;">2024年秋季学期 · 高级计算结构研讨</p>
            <div class="author-info">
                汇报人：李教授 | 计算机科学与技术系 | 2024-11-20
            </div>
        </div>
    </div>
    """

def generate_learning_objectives_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">learning_objectives (学习目标页 - 你刚才修改的)</div>
        <div class="slide-container lo-layout">
            <div class="lo-header">
                <h2 class="lo-title">本节核心教学与学习目标</h2>
                <div style="font-size: 20px; color: #7f8c8d; font-family: monospace; letter-spacing: 2px;">CS-8043</div>
            </div>
            
            <div class="lo-grid">
                <!-- Card 1 -->
                <div class="lo-card" style="border-left: 4px solid #95a5a6;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                        <span style="font-size: 14px; color: #95a5a6; font-weight: bold; font-family: sans-serif;">记忆</span>
                        <span style="font-size: 14px; color: #95a5a6; border: 1px solid #ecf0f1; padding: 2px 8px;">0.5 H</span>
                    </div>
                    <p style="font-size: 20px; color: #34495e; line-height: 1.6; margin: 0;">准确背出注意力机制中 Q、K、V 矩阵的数学定义与各自的作用边界。</p>
                </div>
                
                <!-- Card 2 -->
                <div class="lo-card" style="border-left: 4px solid #7f8c8d;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                        <span style="font-size: 14px; color: #7f8c8d; font-weight: bold; font-family: sans-serif;">理解</span>
                        <span style="font-size: 14px; color: #95a5a6; border: 1px solid #ecf0f1; padding: 2px 8px;">1.5 H</span>
                    </div>
                    <p style="font-size: 20px; color: #34495e; line-height: 1.6; margin: 0;">解释缩放点积注意力 (Scaled Dot-Product Attention) 防止梯度消失的内在逻辑。</p>
                </div>
                
                <!-- Card 3 -->
                <div class="lo-card" style="border-left: 4px solid #34495e;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                        <span style="font-size: 14px; color: #34495e; font-weight: bold; font-family: sans-serif;">应用</span>
                        <span style="font-size: 14px; color: #95a5a6; border: 1px solid #ecf0f1; padding: 2px 8px;">2.0 H</span>
                    </div>
                    <p style="font-size: 20px; color: #34495e; line-height: 1.6; margin: 0;">使用 PyTorch 从零实现一个带 Mask 功能的多头注意力机制前向传播。</p>
                </div>
                
                <!-- Card 4 -->
                <div class="lo-card" style="border-left: 4px solid #b8860b;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                        <span style="font-size: 14px; color: #b8860b; font-weight: bold; font-family: sans-serif;">评价</span>
                        <span style="font-size: 14px; color: #95a5a6; border: 1px solid #ecf0f1; padding: 2px 8px;">1.0 H</span>
                    </div>
                    <p style="font-size: 20px; color: #34495e; line-height: 1.6; margin: 0;">批判性分析 FlashAttention 对比传统计算模式在显存利用率上的得失。</p>
                </div>
            </div>
            
            <div style="position: absolute; bottom: 30px; left: 60px; right: 60px; display: flex; justify-content: space-between; border-top: 1px solid #bdc3c7; padding-top: 16px; font-size: 14px; color: #7f8c8d; font-family: sans-serif;">
                <span>LEARNING OBJECTIVES / CS-8043</span>
                <span>2024 YR</span>
            </div>
        </div>
    </div>
    """

def generate_theory_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">theory_explanation (理论推导页 - 你刚才修改的)</div>
        <div class="slide-container te-layout">
            <div class="lo-header">
                <h2 class="lo-title">高斯过程回归 (GPR) 的边缘对数似然推导</h2>
            </div>
            
            <div class="te-content">
                <div class="te-left">
                    <p style="font-size: 22px; color: #34495e; line-height: 1.8; margin: 0; text-align: justify;">
                        在超参数优化的过程中，我们通常通过最大化边缘似然函数（Marginal Likelihood）来确定协方差函数中的参数 $θ$。与普通的参数估计不同，高斯过程将潜变量 $\mathbf{f}$ 视为积分变量，从而直接得到了观测数据 $\mathbf{y}$ 的后验分布模型。
                    </p>
                    <p style="font-size: 22px; color: #34495e; line-height: 1.8; margin: 0; text-align: justify; margin-top: 10px;">
                        由于观测噪声被假设为独立同分布的零均值高斯噪声 $\epsilon \sim \mathcal{N}(0, \sigma_n^2)$，因此观测向量 $\mathbf{y}$ 本身也服从高斯分布。对该高斯概率密度函数取自然对数，即可将其分解为三个具备明确物理意义的项：第一项代表了模型对数据的拟合度；第二项则等效于一种模型复杂度的惩罚（正则化项）；最后一项为只与维数相关的归一化常数。
                    </p>
                </div>
                <div class="te-right">
                    <div class="te-formula-card">
                        <div class="te-latex">
                            $ \log p(\mathbf{y}|X, \theta) = -\frac{1}{2}\mathbf{y}^T(K+\sigma_n^2 I)^{-1}\mathbf{y} $
                        </div>
                        <p style="font-size: 16px; color: #7f8c8d; margin-top: 10px;">数据拟合项 (Data-fit term)</p>
                    </div>
                    <div class="te-formula-card">
                        <div class="te-latex">
                            $ -\frac{1}{2}\log|K+\sigma_n^2 I| - \frac{n}{2}\log 2\pi $
                        </div>
                        <p style="font-size: 16px; color: #7f8c8d; margin-top: 10px;">复杂度惩罚项与归一化常数</p>
                    </div>
                </div>
            </div>
            
            <div style="position: absolute; bottom: 80px; left: 60px; right: 60px; border-top: 1px solid #e0e0e0; padding-top: 16px;">
                <div style="font-size: 14px; color: #95a5a6; line-height: 1.6; font-family: sans-serif;">
                    <strong style="color: #7f8c8d;">[References] </strong>
                    <span>[1] Rasmussen, C. E., & Williams, C. K. I. (2006). Gaussian processes for machine learning. MIT press.</span>
                </div>
            </div>
            <div style="position: absolute; bottom: 30px; left: 60px; right: 60px; display: flex; justify-content: space-between; font-size: 14px; color: #bdc3c7; font-family: sans-serif;">
                <span>THEORY & EXPLANATION</span>
                <span>Page 14</span>
            </div>
        </div>
    </div>
    """

def generate_toc_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">toc_academic (学术目录/标准目录)</div>
        <div class="slide-container academic-toc">
            <div class="lo-header">
                <h2 class="lo-title">研究大纲 (Table of Contents)</h2>
            </div>
            <div class="toc-list">
                <div class="toc-item"><span>01</span> 研究背景与动机综述</div>
                <div class="toc-item"><span>02</span> GPR模型数学机理推导</div>
                <div class="toc-item"><span>03</span> 核心实验设计与数据集说明</div>
                <div class="toc-item"><span>04</span> 对比分析与消融实验结果展示</div>
                <div class="toc-item"><span>05</span> 局限性与未来工作展望</div>
            </div>
            <div style="position: absolute; bottom: 30px; left: 60px; right: 60px; border-top: 1px solid #bdc3c7; padding-top: 16px; text-align: right; font-size: 14px; color: #7f8c8d; font-family: sans-serif;">AGENDA</div>
        </div>
    </div>
    """

def generate_key_concepts_html():
     return r"""
    <div class="slide-wrapper">
        <div class="slide-label">key_concepts (核心概念卡片/复用术语解释)</div>
        <div class="slide-container academic-bullets">
            <div class="lo-header">
                <h2 class="lo-title">核心术语界定</h2>
            </div>
            <div style="margin-top: 30px;">
                <div class="bullet-item">
                    <div class="bullet-title">同方差噪声<br><span style="font-size: 16px; font-weight: normal; color: #94a3b8; font-style: italic;">Homoscedasticity</span></div>
                    <div class="bullet-desc">假设观测过程中，所有的测量数据点都受到具有相同方差的高斯噪声污染，不随输入变量 X 的改变而改变。</div>
                </div>
                <div class="bullet-item">
                    <div class="bullet-title">协方差函数<br><span style="font-size: 16px; font-weight: normal; color: #94a3b8; font-style: italic;">Kernel Function</span></div>
                    <div class="bullet-desc">衡量两个输入样本之间相似度的度量核函数，直接决定了先验分布下目标函数的光滑程度及周期性等核心特征性质。常用的有平方指数内核 (SE) 和 Matern 内核等。</div>
                </div>
                <div class="bullet-item">
                    <div class="bullet-title">边缘化<br><span style="font-size: 16px; font-weight: normal; color: #94a3b8; font-style: italic;">Marginalization</span></div>
                    <div class="bullet-desc">在贝叶斯推断中，通过在所有可能的潜变量模型参数上的积分操作来获得观测数据本身对数似然的过程，是完全避免过度拟合的核心。</div>
                </div>
            </div>
        </div>
    </div>
    """


def generate_case_study_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">academic_case_study (Variant B: 上下流式布局与分离式场景介绍)</div>
        <div class="slide-container" style="padding: 60px; background-color: #f8f9fa; font-family: 'Times New Roman', Times, Georgia, serif; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #2c3e50; padding-bottom: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
                <h2 style="font-size: 44px; font-weight: bold; color: #2c3e50; margin: 0; border-left: 8px solid #c0392b; padding-left: 16px;">典型电喷发动故障分析</h2>
                <div style="font-size: 20px; color: #7f8c8d; font-family: sans-serif; letter-spacing: 2px;">CASE STUDY (VARIANT B)</div>
            </div>
            
            <div style="display: flex; flex-direction: column; height: calc(100% - 130px); gap: 30px;">
                <div style="display: flex; gap: 40px; background-color: #2c3e50; color: #fff; padding: 40px; border-radius: 12px;">
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                        <h3 style="font-size: 24px; color: #f1c40f; font-family: sans-serif; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">Scenario Analysis</h3>
                        <p style="font-size: 24px; line-height: 1.7; margin: 0;">一辆行驶里程约8万km的2019年款大众迈腾1.8T轿车，车主反映该车在热车怠速时出现剧烈抖动，并在加速时感觉到明显的动力不足，仪表盘发动机故障灯常亮。</p>
                        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 20px; color: #e74c3c; font-style: italic;"><strong>Issue:</strong> 如何在没有专用诊断电脑的情况下快速定位失火缸？</div>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="color: #7f8c8d; font-size: 18px; font-family: sans-serif; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Key Findings & Action Items</div>
                    <div style="display: flex; gap: 24px; align-items: stretch;">
                        <div style="flex: 1; display: flex; flex-direction: column; background-color: #fff; padding: 24px; border: 2px solid #ecf0f1; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
                           <h4 style="font-size: 22px; color: #c0392b; font-family: sans-serif; margin: 0 0 12px 0;">基础检查排查真空泄漏</h4>
                           <p style="font-size: 18px; color: #34495e; margin: 0; line-height: 1.6;">首先检查进气歧管及各真空管路，未发现有破损和漏气现象，排除由于进气量波动造成的抖动。</p>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; background-color: #fff; padding: 24px; border: 2px solid #ecf0f1; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
                           <h4 style="font-size: 22px; color: #c0392b; font-family: sans-serif; margin: 0 0 12px 0;">断缸法测试确认失火缸</h4>
                           <p style="font-size: 18px; color: #34495e; margin: 0; line-height: 1.6;">在怠速状态下逐一拔下各缸点火线圈插头，发现拔下2缸时，发动机抖动幅度无明显变化。</p>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; background-color: #fff; padding: 24px; border: 2px solid #ecf0f1; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
                           <h4 style="font-size: 22px; color: #c0392b; font-family: sans-serif; margin: 0 0 12px 0;">对调部件确诊故障源</h4>
                           <p style="font-size: 18px; color: #34495e; margin: 0; line-height: 1.6;">将2缸与1缸的点火线圈互换后故障转移至1缸，最终确诊为原2缸点火线圈损坏。</p>
                        </div>
                    </div>
                </div>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; width: 100%; background-color: #27ae60; color: #fff; padding: 16px 60px; font-size: 20px; font-weight: bold; text-align: center;">CONCLUSION: 案例启示：交叉互换法是不用借助昂贵器械排查的最好办法。</div>
        </div>
    </div>
    """

def generate_comparison_table_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">academic_comparison (Variant B: 居中碰撞型对比矩阵)</div>
        <div class="slide-container" style="padding: 60px; background-color: #f8f9fa; font-family: 'Times New Roman', Times, Georgia, serif; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #2c3e50; padding-bottom: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                   <h2 style="font-size: 44px; font-weight: bold; color: #2c3e50; margin: 0;">数控车床与铣床加工工艺对比</h2>
                   <p style="font-size: 20px; color: #7f8c8d; margin: 8px 0 0 0; font-family: sans-serif;">CNC Turning vs CNC Milling</p>
                </div>
                <div style="font-size: 20px; color: #7f8c8d; font-family: sans-serif; letter-spacing: 2px;">MATRIX COMPARISON (VARIANT B)</div>
            </div>

            <div style="display: flex; flex-direction: column; height: calc(100% - 130px); justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 40px; justify-content: center; flex: 1;">
                   <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                      <div style="text-align: right; border-bottom: 3px solid #e74c3c; padding-bottom: 12px;">
                         <h3 style="font-size: 32px; color: #2c3e50; margin: 0; font-family: sans-serif;">数控车床 (CNC Lathe)</h3>
                         <p style="margin: 8px 0 0 0; font-size: 18px; color: #7f8c8d;">加工回转体零件，工件旋转，刀具做进给运动</p>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 12px;">
                          <div style="font-size: 20px; color: #fff; background-color: #34495e; padding: 12px 20px; border-radius: 8px; text-align: right;">适合加工圆柱、圆锥、螺纹等对称回转特征</div>
                          <div style="font-size: 20px; color: #fff; background-color: #34495e; padding: 12px 20px; border-radius: 8px; text-align: right;">夹具多为三爪卡盘，装夹定位相对统一</div>
                          <div style="font-size: 20px; color: #fff; background-color: #34495e; padding: 12px 20px; border-radius: 8px; text-align: right;">切削过程连续平稳，表面粗糙度易于控制</div>
                      </div>
                   </div>
                   
                   <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                      <div style="width: 2px; height: 60px; background-color: #bdc3c7;"></div>
                      <div style="width: 60px; height: 60px; border-radius: 50%; background-color: #e74c3c; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; font-family: sans-serif;">VS</div>
                      <div style="width: 2px; height: 60px; background-color: #bdc3c7;"></div>
                   </div>
                   
                   <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                      <div style="text-align: left; border-bottom: 3px solid #3498db; padding-bottom: 12px;">
                         <h3 style="font-size: 32px; color: #2c3e50; margin: 0; font-family: sans-serif;">数控铣床 (CNC Mill)</h3>
                         <p style="margin: 8px 0 0 0; font-size: 18px; color: #7f8c8d;">加工非回转体，刀具旋转切削，工件通常固定</p>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 12px;">
                          <div style="font-size: 20px; color: #2c3e50; border: 2px solid #bdc3c7; padding: 12px 20px; border-radius: 8px;">适合非对称零件、箱体类、模具及异形面加工</div>
                          <div style="font-size: 20px; color: #2c3e50; border: 2px solid #bdc3c7; padding: 12px 20px; border-radius: 8px;">常需平口钳或定制夹具，装夹找正难度较大</div>
                          <div style="font-size: 20px; color: #2c3e50; border: 2px solid #bdc3c7; padding: 12px 20px; border-radius: 8px;">多刃刀具常发生断续切削，容易产生震动</div>
                      </div>
                   </div>
                </div>
                <div style="text-align: center; padding: 20px; background-color: #ecf0f1; border-radius: 8px; font-size: 20px; color: #2c3e50; font-family: sans-serif; margin-top: 20px;"><strong>💡 综述: </strong>车削是“动件静刀”擅长对称件，铣削是“静件动刀”擅长异面。复杂零件则要经历车铣复合。</div>
            </div>
        </div>
    </div>
    """

def generate_diagram_illustration_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">academic_diagram (Variant B: 顶图横幅下方文字卡片)</div>
        <div class="slide-container" style="padding: 60px; background-color: #ffffff; font-family: 'Times New Roman', Times, Georgia, serif; box-sizing: border-box;">
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="border-bottom: 2px solid #2c3e50; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                       <h2 style="font-size: 44px; font-weight: bold; color: #2c3e50; margin: 0;">原理解析：液压齿轮泵</h2>
                    </div>
                    <div style="font-size: 20px; color: #7f8c8d; font-family: sans-serif; letter-spacing: 2px;">DIAGRAM (VARIANT B)</div>
                </div>
            
                <!-- Diagram Banner: Smart Stretching -->
                <div style="flex: 1; width: 100%; min-height: 280px; background-color: #2c3e50; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: center; align-items: center; overflow: hidden; border: 2px solid #ecf0f1; position: relative;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1280') center/cover no-repeat; filter: blur(15px); opacity: 0.15;"></div>
                    <div style="font-size: 18px; color: #7f8c8d; position: relative; z-index: 1;">[ 此处呈现：智能模糊拉伸背景下的全景结构图 ]</div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <div style="flex: 1; background-color: #f9fbfd; border: 1px solid #e1e8ed; padding: 12px 16px; border-top: 4px solid #3498db; display: flex; flex-direction: column; gap: 6px;">
                         <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="background-color: #3498db; color: #fff; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold; font-family: sans-serif; font-size: 14px; flex-shrink: 0;">1</div>
                            <div style="font-size: 18px; color: #2c3e50; font-weight: bold; font-family: sans-serif;">吸油侧容积扩散</div>
                         </div>
                         <div style="font-size: 14px; color: #7f8c8d; line-height: 1.5; text-align: justify;">两个啮合的齿轮在驱动下反向分离，轮齿脱开使得吸油腔体积变大，产生局部真空。</div>
                    </div>
                    <div style="flex: 1; background-color: #f9fbfd; border: 1px solid #e1e8ed; padding: 12px 16px; border-top: 4px solid #3498db; display: flex; flex-direction: column; gap: 6px;">
                         <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="background-color: #3498db; color: #fff; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold; font-family: sans-serif; font-size: 14px; flex-shrink: 0;">2</div>
                            <div style="font-size: 18px; color: #2c3e50; font-weight: bold; font-family: sans-serif;">沿壁面输送过程</div>
                         </div>
                         <div style="font-size: 14px; color: #7f8c8d; line-height: 1.5; text-align: justify;">液压油被封在齿沟与泵壳体内壁之间，随着轮齿的旋转，原封不动地被挤送。</div>
                    </div>
                    <div style="flex: 1; background-color: #f9fbfd; border: 1px solid #e1e8ed; padding: 12px 16px; border-top: 4px solid #3498db; display: flex; flex-direction: column; gap: 6px;">
                         <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="background-color: #3498db; color: #fff; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold; font-family: sans-serif; font-size: 14px; flex-shrink: 0;">3</div>
                            <div style="font-size: 18px; color: #2c3e50; font-weight: bold; font-family: sans-serif;">排油腔高压挤出</div>
                         </div>
                         <div style="font-size: 14px; color: #7f8c8d; line-height: 1.5; text-align: justify;">轮齿在排油侧重新剧烈啮合，强行占据齿缝空间减小排油区总体积，泵出油路。</div>
                    </div>
                </div>
                <div style="margin-top: auto; padding-top: 12px; text-align: center; font-size: 18px; color: #16a085; font-family: sans-serif; font-weight: bold; border-top: 1px dashed #bdc3c7;">原理要点：分离吸油，闭合压油，油随端壁走外圈。</div>
            </div>
        </div>
    </div>
    """

def generate_academic_practice_v1_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">academic_practice (Variant A: 左右分栏标准版)</div>
        <div class="slide-container" style="padding: 60px; background-color: #f8f9fa; font-family: 'Times New Roman', Times, Georgia, serif; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #2c3e50; padding-bottom: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
                <h2 style="font-size: 44px; font-weight: bold; color: #2c3e50; margin: 0;">课堂实操：绘制三维零件图</h2>
                <div style="font-size: 20px; color: #7f8c8d; font-family: sans-serif; letter-spacing: 2px;">HANDS-ON TASK</div>
            </div>

            <div style="display: flex; gap: 40px; height: calc(100% - 130px); box-sizing: border-box;">
                <div style="flex: 1.2; display: flex; flex-direction: column; gap: 24px;">
                    <div style="background-color: #ffffff; border: 1px solid #bdc3c7; padding: 30px; flex: 1; display: flex; flex-direction: column;">
                        <h3 style="font-size: 24px; color: #2c3e50; font-family: sans-serif; border-bottom: 3px solid #e67a22; display: inline-block; padding-bottom: 8px; margin: 0 0 20px 0; align-self: flex-start;">
                            任务描述 / 情境模拟
                        </h3>
                        <p style="font-size: 24px; color: #34495e; line-height: 1.8; margin: 0; text-align: justify;">请根据所给的阶梯轴二维工程图纸，在 SolidWorks 软件中构建其三维实体模型。注意圆角特征与退刀槽的尺寸精度，并完成质量属性分析。</p>
                    </div>
                    <div style="padding: 16px 20px; background-color: #fcf3cf; border-left: 6px solid #f1c40f; color: #8e44ad; font-size: 18px; font-weight: bold; font-family: sans-serif;">
                        💡 实训提示： <span style="font-weight: normal; color: #2c3e50;">注意设置正确的材料（45号钢）以获取准确重量。</span>
                    </div>
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; gap: 16px; justify-content: center;">
                    <div style="background-color: #ffffff; border: 1px solid #bdc3c7; padding: 24px; height: 100%; display: flex; flex-direction: column;">
                        <h3 style="font-size: 24px; color: #2c3e50; font-family: sans-serif; margin-top: 0; margin-bottom: 20px;">考核维度/操作要求</h3>
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="color: #27ae60; font-size: 24px; margin-top: -2px;">✓</div>
                                <div style="font-size: 20px; color: #34495e; line-height: 1.6; font-family: sans-serif;">基体旋转扫描特征参数正确。</div>
                            </div>
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="color: #27ae60; font-size: 24px; margin-top: -2px;">✓</div>
                                <div style="font-size: 20px; color: #34495e; line-height: 1.6; font-family: sans-serif;">键槽定位尺寸公差符合图纸要求。</div>
                            </div>
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="color: #27ae60; font-size: 24px; margin-top: -2px;">✓</div>
                                <div style="font-size: 20px; color: #34495e; line-height: 1.6; font-family: sans-serif;">完成仿真渲染图并导出 STEP 格式。</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """

def generate_academic_practice_v2_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">academic_practice (Variant B: 顶部大题面下方选项铺开)</div>
        <div class="slide-container" style="padding: 60px; background-color: #f8f9fa; font-family: 'Times New Roman', Times, Georgia, serif; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #2c3e50; padding-bottom: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
                <h2 style="font-size: 44px; font-weight: bold; color: #2c3e50; margin: 0;">随堂检查：网络架构演进</h2>
                <div style="font-size: 20px; color: #7f8c8d; font-family: sans-serif; letter-spacing: 2px;">QUIZ CHECK (VARIANT B)</div>
            </div>

            <div style="display: flex; flex-direction: column; height: calc(100% - 110px); box-sizing: border-box; gap: 20px;">
                <!-- 题干区：弹性比例 1 -->
                <div style="flex: 1; background-color: #ffffff; border: 1px solid #e0e0e0; padding: 30px 40px; box-shadow: 0 8px 24px rgba(0,0,0,0.03); text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 12px;">
                   <h3 style="font-size: 22px; color: #3498db; font-family: sans-serif; margin: 0 0 16px 0; letter-spacing: 1px; text-transform: uppercase;">Task Context</h3>
                   <p style="font-size: 26px; color: #2c3e50; line-height: 1.5; margin: 0; font-weight: bold; max-width: 850px;">在软件定义网络（SDN）架构中，负责将控制平面的命令翻译并下发给数据平面设备的标准南向接口协议是？</p>
                   
                   <div style="display: inline-block; padding: 10px 20px; background-color: #2c3e50; color: #fff; border-radius: 20px; font-size: 16px; margin-top: 20px; font-family: sans-serif;">
                       💡 TIP：它不是北向也不是东向协议。
                   </div>
                </div>
                
                <!-- 选项区：弹性比例 0.8 -->
                <div style="flex: 0.8; display: flex; align-items: center;">
                    <div style="display: flex; gap: 20px; width: 100%; align-items: stretch;">
                        <div style="flex: 1; background-color: #fff; border: 3px solid #ecf0f1; border-top: 6px solid #e74c3c; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                            <div style="width: 48px; height: 48px; background-color: #fef9e7; color: #e67a22; font-size: 24px; font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">A</div>
                            <div style="font-size: 20px; color: #2c3e50; font-family: sans-serif;">RESTful API</div>
                        </div>
                        <div style="flex: 1; background-color: #fff; border: 3px solid #ecf0f1; border-top: 6px solid #e74c3c; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                            <div style="width: 48px; height: 48px; background-color: #fef9e7; color: #e67a22; font-size: 24px; font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">B</div>
                            <div style="font-size: 20px; color: #2c3e50; font-family: sans-serif;">OpenFlow</div>
                        </div>
                        <div style="flex: 1; background-color: #fff; border: 3px solid #ecf0f1; border-top: 6px solid #e74c3c; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                            <div style="width: 48px; height: 48px; background-color: #fef9e7; color: #e67a22; font-size: 24px; font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">C</div>
                            <div style="font-size: 20px; color: #2c3e50; font-family: sans-serif;">NETCONF</div>
                        </div>
                        <div style="flex: 1; background-color: #fff; border: 3px solid #ecf0f1; border-top: 6px solid #e74c3c; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                            <div style="width: 48px; height: 48px; background-color: #fef9e7; color: #e67a22; font-size: 24px; font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">D</div>
                            <div style="font-size: 20px; color: #2c3e50; font-family: sans-serif;">BGP-LS</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """

def generate_ending_academic_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">ending_academic (课程总结与作业要求)</div>
        <div class="slide-container" style="padding: 60px; background-color: #2c3e50; color: #ffffff; font-family: 'Times New Roman', Times, Georgia, serif; box-sizing: border-box;">
            <div style="border-bottom: 2px solid rgba(255,255,255,0.2); padding-bottom: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
                <h2 style="font-size: 44px; font-weight: bold; margin: 0;">第六章 钣金焊接工艺小结</h2>
                <div style="font-size: 20px; color: #bdc3c7; font-family: sans-serif; letter-spacing: 2px;">SUMMARY & ASSIGNMENT</div>
            </div>

            <div style="display: flex; gap: 40px; height: calc(100% - 130px); box-sizing: border-box;">
                <div style="flex: 1.2; display: flex; flex-direction: column; gap: 20px; padding-right: 40px; border-right: 1px solid rgba(255,255,255,0.2);">
                    <h3 style="font-size: 28px; color: #ecf0f1; display: inline-block; border-bottom: 2px solid #3498db; padding-bottom: 8px; margin: 0 0 20px 0; font-family: sans-serif;">
                        核心实训知识回顾
                    </h3>
                    <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 24px;">
                        <li style="font-size: 22px; color: #bdc3c7; display: flex; gap: 16px; line-height: 1.6;">
                            <span style="color: #3498db; font-weight: bold;">•</span>
                            CO2气体保护焊的起弧角度以及横焊与立焊送丝速度的匹配逻辑。
                        </li>
                        <li style="font-size: 22px; color: #bdc3c7; display: flex; gap: 16px; line-height: 1.6;">
                            <span style="color: #3498db; font-weight: bold;">•</span>
                            热应力变形现象，以及使用夹具和"对称跳焊去应力法"的机械补偿手段。
                        </li>
                        <li style="font-size: 22px; color: #bdc3c7; display: flex; gap: 16px; line-height: 1.6;">
                            <span style="color: #3498db; font-weight: bold;">•</span>
                            焊接缺陷（气孔、夹渣、咬边）产生的四大核心原因及外观鉴别。
                        </li>
                    </ul>
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; gap: 40px;">
                    <div style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 24px; flex: 1;">
                        <h3 style="font-size: 24px; color: #f1c40f; margin: 0 0 16px 0; font-family: sans-serif; display: flex; align-items: center; gap: 8px;">
                            <span>📋</span> 车间实训任务报告要求
                        </h3>
                        <ul style="margin: 0; padding: 0 0 0 24px; display: flex; flex-direction: column; gap: 16px; color: #ecf0f1;">
                            <li style="font-size: 20px; line-height: 1.5; font-family: sans-serif;">利用所发的三块低碳钢钢板，完成长度不低于 20cm 的平焊和横焊拉练，保留焊缝。</li>
                            <li style="font-size: 20px; line-height: 1.5; font-family: sans-serif;">针对自己实操中出现的气渣缺陷，拍照并在实习报告内写下根因诊断。（周五上交）</li>
                        </ul>
                    </div>

                    <div style="padding: 24px; border-left: 6px solid #e74c3c; background-color: rgba(231, 76, 60, 0.1); color: #fff;">
                        <div style="font-size: 18px; color: #e74c3c; font-weight: bold; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                            [ 预习：下周四车间导览 ]
                        </div>
                        <div style="font-size: 24px; font-style: italic;">
                            第七章 - 激光焊接技艺前沿与精密五金修复
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """

def generate_narrative_html():
    return r"""
    <div class="slide-wrapper">
        <div class="slide-label">academic_narrative (学术长文叙述页 - 专为长文本大段落设计的新版式)</div>
        <div class="slide-container te-layout" style="padding: 60px; background-color: #f8f9fa;">
            <div class="lo-header">
                <h2 class="lo-title">Transformer 模型注意力机制深度剖析</h2>
            </div>
            
            <div class="te-content" style="gap: 60px;">
                <!-- 左栏：主叙述 -->
                <div class="te-left" style="flex: 7; border-right: none; padding-right: 0; gap: 24px;">
                    <p style="font-size: 24px; color: #34495e; line-height: 1.9; margin: 0; text-align: justify;">
                        <span style="float: left; font-size: 68px; line-height: 60px; padding-top: 4px; padding-right: 12px; color: #2c3e50; font-weight: bold;">在</span>自然语言处理（NLP）领域的漫长发展史中，序列模型的瓶颈一直在于长距离依赖的丢失。递归神经网络（RNN）及其变体（LSTM 等）由于其固有的时序递归结构，尽管能在一定程度上记忆上下文，但在处理长序列时由于梯度消失问题而受阻，更致命的是，它无法进行高效地并行计算。
                    </p>
                    <div style="margin: 20px 0; padding: 20px 30px; border-left: 6px solid #2c3e50; background-color: #f1f2f6; font-size: 28px; color: #2c3e50; font-style: italic; line-height: 1.6;">
                        "Attention Is All You Need. It completely eschews recurrence and relies entirely on an attention mechanism to draw global dependencies between input and output."
                    </div>
                    <p style="font-size: 24px; color: #34495e; line-height: 1.9; margin: 0; text-align: justify;">
                        基于此，Vaswani 等人在 2017 年提出了完全抛弃 RNN 与 CNN 架构的 Transformer 模型。其核心理念是「自注意力机制 (Self-Attention)」，通过三个可学习矩阵（查询 $Q$、键 $K$ 和值 $V$）将序列中的每一个单词关联起来。每个单词都可以独立且并行地与句子中任何位置的其他单词计算相关性分数。这不仅使得梯度的传播路径缩短到了 $O(1)$，彻底消除了梯度消失问题，同时由于完全的矩阵相乘设计，使得它在 modern GPU 硬件上获得了无可比拟的并行加速能力。
                    </p>
                </div>
                
                <!-- 右栏：边注（Tufte Margin Notes） -->
                <div class="te-right" style="flex: 3; border-left: 1px solid #dcdde1; padding-left: 30px; padding-top: 10px; justify-content: flex-start; gap: 30px;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 14px; color: #e67a22; font-weight: bold; font-family: sans-serif; letter-spacing: 1px;">KEY INSIGHT</div>
                        <div style="font-size: 18px; color: #7f8c8d; line-height: 1.6; text-align: justify;">真正的革命不仅在于算法的效果，更在于它与 GPU 矩阵乘法的极致契合。这是深度学习中“硬件反向塑造算法设计”的教科书级案例。</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 14px; color: #e67a22; font-weight: bold; font-family: sans-serif; letter-spacing: 1px;">MATHEMATICAL INTUITION</div>
                        <div style="font-size: 18px; color: #7f8c8d; line-height: 1.6; text-align: justify;">$ Attention(Q,K,V) = softmax(\frac{QK^T}{\sqrt{d_k}})V $。除以 $\sqrt{d_k}$ 是为了防止随着维度增大，点积结果过大导致 softmax 梯度趋近于 0。</div>
                    </div>
                </div>
            </div>
            
            <div style="position: absolute; bottom: 30px; left: 60px; right: 60px; display: flex; justify-content: space-between; border-top: 1px solid #bdc3c7; padding-top: 16px; font-size: 14px; color: #bdc3c7; font-family: sans-serif;">
                <span>KNOWLEDGE EXPLANATION</span>
                <span>2024 YR</span>
            </div>
        </div>
    </div>
    """

HTML_FOOTER = """
</body>
</html>
"""

def generate_preview():
    output_path = "/Users/bisuv/Desktop/02_今日处理中-Today/ai生成ppt项目/banana_ppt/tests/html_previews/academic_preview.html"
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(HTML_SKELETON)
        f.write(generate_cover_html())
        f.write(generate_toc_html())
        f.write(generate_learning_objectives_html())
        f.write(generate_narrative_html())
        f.write(generate_academic_practice_v1_html())
        f.write(generate_academic_practice_v2_html())
        f.write(generate_case_study_html())
        f.write(generate_comparison_table_html())
        f.write(generate_diagram_illustration_html())
        f.write(generate_ending_academic_html())
        f.write(generate_theory_html())
        f.write(generate_key_concepts_html())
        f.write(HTML_FOOTER)
        
    print(f"预览文件已成功生成: {output_path}")

if __name__ == "__main__":
    generate_preview()
