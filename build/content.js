// 内容脚本

// 全局变量
let controlPanel = null;
let isPanelOpen = false;

// 初始化
function init() {
  createFloatingIcon();
}

// 创建圆形浮动图标
function createFloatingIcon() {
  const icon = document.createElement('div');
  icon.id = 'toutiao-comment-extractor-icon';
  icon.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-color: rgba(255, 165, 0, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    font-size: 24px;
    color: white;
    transition: all 0.3s ease;
  `;
  icon.innerHTML = '📝';
  
  icon.addEventListener('click', toggleControlPanel);
  
  document.body.appendChild(icon);
}

// 切换控制面板
function toggleControlPanel() {
  if (controlPanel) {
    if (isPanelOpen) {
      closeControlPanel();
    } else {
      openControlPanel();
    }
  } else {
    createControlPanel();
    openControlPanel();
  }
}

// 创建控制面板
function createControlPanel() {
  controlPanel = document.createElement('div');
  controlPanel.id = 'toutiao-comment-extractor-panel';
  controlPanel.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 300px;
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    padding: 20px;
    z-index: 9998;
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s ease;
  `;
  
  controlPanel.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">头条评论提取器</h3>
    <button id="start-extract" style="
      width: 100%;
      padding: 10px;
      background-color: #ff6b35;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 10px;
    ">开始提取</button>
    <div id="status" style="
      font-size: 12px;
      color: #666;
      margin-top: 10px;
      min-height: 40px;
    ">点击开始提取评论</div>
  `;
  
  document.body.appendChild(controlPanel);
  
  document.getElementById('start-extract').addEventListener('click', startCrawlProcess);
}

// 打开控制面板
function openControlPanel() {
  if (controlPanel) {
    controlPanel.style.transform = 'translateY(0)';
    controlPanel.style.opacity = '1';
    isPanelOpen = true;
  }
}

// 关闭控制面板
function closeControlPanel() {
  if (controlPanel) {
    controlPanel.style.transform = 'translateY(20px)';
    controlPanel.style.opacity = '0';
    isPanelOpen = false;
  }
}

// 显示状态
function showStatus(message) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

// 提取文章信息
function extractArticleInfo() {
  let title = document.title;
  if (!title) {
    const titleElement = document.querySelector('h1');
    if (titleElement) {
      title = titleElement.textContent.trim();
    } else {
      title = '未知标题';
    }
  }
  
  // 提取文章ID
  let articleId = null;
  const url = window.location.href;
  const match = url.match(/article\/(\d+)/);
  if (match) {
    articleId = match[1];
  }
  
  return { title, articleId };
}

// 滚动页面加载所有评论
async function scrollToLoadAllComments() {
  showStatus('正在滚动加载评论...');
  
  const maxScrolls = 20;
  let scrollCount = 0;
  let lastHeight = document.body.scrollHeight;
  
  while (scrollCount < maxScrolls) {
    window.scrollTo(0, document.body.scrollHeight);
    scrollCount++;
    
    // 等待评论加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查是否还有新内容加载
    const newHeight = document.body.scrollHeight;
    if (newHeight === lastHeight) {
      break;
    }
    lastHeight = newHeight;
  }
  
  // 滚动回顶部
  window.scrollTo(0, 0);
  showStatus('滚动加载完成');
}

// 寻找评论容器
function findCommentContainers() {
  const selectors = [
    '.comment-list',
    '.comments-container',
    '.comment-area',
    '.reply-list',
    '[class*="comment"]',
    '[class*="reply"]',
    '.tt-comment',
    '.byted-comment'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return elements;
    }
  }
  
  return [];
}

// 从容器提取评论
function extractCommentsFromContainer(container) {
  const comments = [];
  
  // 多种评论元素选择器
  const commentSelectors = [
    '.comment-item',
    '.comment-content',
    '.reply-content',
    '.comment-text',
    '.content',
    'p',
    'span'
  ];
  
  for (const selector of commentSelectors) {
    const commentElements = container.querySelectorAll(selector);
    commentElements.forEach(element => {
      const text = element.textContent.trim();
      if (text && text.length > 10) {
        comments.push(text);
      }
    });
  }
  
  return comments;
}

// 从DOM提取评论
async function extractCommentsFromDOM() {
  showStatus('正在从DOM提取评论...');
  
  const containers = findCommentContainers();
  let allComments = [];
  
  if (containers.length > 0) {
    containers.forEach(container => {
      const comments = extractCommentsFromContainer(container);
      allComments = [...allComments, ...comments];
    });
  } else {
    // 全局搜索评论
    const globalSelectors = ['.comment', '.reply'];
    globalSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = element.textContent.trim();
        if (text && text.length > 10) {
          allComments.push(text);
        }
      });
    });
  }
  
  // 去重
  allComments = deduplicateComments(allComments);
  showStatus(`从DOM提取到 ${allComments.length} 条评论`);
  return allComments;
}

// 评论去重
function deduplicateComments(comments) {
  const uniqueComments = [];
  const seen = new Set();
  
  comments.forEach(comment => {
    const normalized = comment.replace(/\s+/g, ' ').toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueComments.push(comment);
    }
  });
  
  return uniqueComments;
}

// 提取正文内容
function extractContent() {
  let content = '';
  
  // 尝试多种正文选择器
  const contentSelectors = [
    'article',
    '.article-content',
    '.content',
    '#article-content',
    '.tt-article-content'
  ];
  
  for (const selector of contentSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(element => {
        content += element.textContent.trim() + '\n\n';
      });
      break;
    }
  }
  
  // 如果没有找到，尝试所有段落
  if (!content) {
    const paragraphs = document.querySelectorAll('p');
    paragraphs.forEach(p => {
      content += p.textContent.trim() + '\n\n';
    });
  }
  
  return content;
}

// 开始抓取流程
async function startCrawlProcess() {
  showStatus('开始提取...');
  
  try {
    // 提取文章信息
    const articleInfo = extractArticleInfo();
    
    // 提取正文
    const content = extractContent();
    
    // 滚动加载评论
    await scrollToLoadAllComments();
    
    // 提取评论
    let comments = await extractCommentsFromDOM();
    
    // 如果评论数量较少，尝试备用方法
    if (comments.length < 20) {
      showStatus('尝试备用方法提取评论...');
      const backupComments = extractAllComments();
      comments = [...new Set([...comments, ...backupComments])];
    }
    
    showStatus(`共提取到 ${comments.length} 条评论`);
    
    // 生成并下载MD文件
    await downloadData(articleInfo.title, content, comments);
    
    showStatus('提取完成，文件已下载');
  } catch (error) {
    showStatus(`提取失败: ${error.message}`);
    console.error('提取失败:', error);
  }
}

// 备用评论提取方法
function extractAllComments() {
  const comments = [];
  
  // 全局搜索所有可能的评论元素
  const allElements = document.querySelectorAll('div, p, span');
  allElements.forEach(element => {
    const text = element.textContent.trim();
    if (text && text.length > 15 && text.length < 1000) {
      // 过滤掉明显不是评论的内容
      if (!text.includes('广告') && !text.includes('推荐') && !text.includes('关注')) {
        comments.push(text);
      }
    }
  });
  
  return deduplicateComments(comments);
}

// 下载数据
function downloadData(title, content, comments) {
  return new Promise((resolve) => {
    // 生成MD格式
    const markdown = `# 正文及评论\n\n` +
                    `${content}\n` +
                    `## 共有评论${comments.length}条\n\n` +
                    comments.map(comment => `${comment}\n\n---\n\n`).join('');
    
    // 发送消息给后台脚本下载
    chrome.runtime.sendMessage({
      action: 'download',
      data: {
        title: title,
        content: markdown
      }
    }, (response) => {
      resolve();
    });
  });
}

// 监听来自后台的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    startCrawlProcess();
    sendResponse({ success: true });
  }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}