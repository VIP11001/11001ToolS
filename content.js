// 从页面中提取文章信息
function extractArticleInfo() {
  // 提取文章标题
  let title = document.title;
  if (title) {
    // 移除标题中的多余信息
    title = title.replace(/ - 今日头条/, '').trim();
  }

  // 提取文章ID
  let article_id = '';
  
  // 1. 从URL中提取多种可能的模式
  const urlPatterns = [
    /\/article\/(\d+)/,
    /\/a(\d+)\//,
    /(group|item)_id=([^&]+)/,
    /group_id['"]?\s*[:=]\s*['"]?(\d+)/,
    /item_id['"]?\s*[:=]\s*['"]?(\d+)/
  ];
  
  for (const pattern of urlPatterns) {
    const urlMatch = window.location.href.match(pattern);
    if (urlMatch) {
      // 查找第一个匹配的数字组
      for (let i = 1; i < urlMatch.length; i++) {
        if (urlMatch[i] && /^\d+$/.test(urlMatch[i])) {
          article_id = urlMatch[i];
          console.log('从URL提取到文章ID:', article_id);
          break;
        }
      }
      if (article_id) break;
    }
  }
  
  // 2. 从页面meta标签中提取
  if (!article_id) {
    const metaSelectors = [
      'meta[name="_oid"]',
      'meta[name="articleId"]',
      'meta[property="article:id"]'
    ];
    for (const selector of metaSelectors) {
      const metaElement = document.querySelector(selector);
      if (metaElement && metaElement.content) {
        article_id = metaElement.content;
        console.log('从meta标签提取到文章ID:', article_id);
        break;
      }
    }
  }
  
  // 3. 从script标签中提取多种模式
  if (!article_id) {
    const scriptElements = document.querySelectorAll('script');
    const scriptPatterns = [
      /article_id["']\s*:\s*["']?(\d+)["']?/,
      /group_id["']\s*:\s*["']?(\d+)["']?/,
      /item_id["']\s*:\s*["']?(\d+)["']?/,
      /id["']\s*:\s*["']?(\d+)["']?.*?article/,
      /article.*?id["']\s*:\s*["']?(\d+)["']?/
    ];
    
    for (const script of scriptElements) {
      const scriptContent = script.textContent;
      for (const pattern of scriptPatterns) {
        const match = scriptContent.match(pattern);
        if (match && match[1]) {
          article_id = match[1];
          console.log('从script标签提取到文章ID:', article_id);
          break;
        }
      }
      if (article_id) break;
    }
  }
  
  // 4. 从页面数据属性中提取
  if (!article_id) {
    const dataElements = document.querySelectorAll('[data-article-id], [data-group-id], [data-item-id]');
    for (const el of dataElements) {
      article_id = el.dataset.articleId || el.dataset.groupId || el.dataset.itemId;
      if (article_id) {
        console.log('从data属性提取到文章ID:', article_id);
        break;
      }
    }
  }

  return {
    title: title,
    article_id: article_id,
    url: window.location.href
  };
}

// 解析评论API响应
function parseCommentResponse(data) {
  const comments = [];
  console.log('解析评论响应:', data);

  // 尝试多种可能的数据结构
  let commentList = [];
  if (data.comments) {
    commentList = data.comments;
  } else if (data.data && data.data.comments) {
    commentList = data.data.comments;
  } else if (data.data && data.data.items) {
    commentList = data.data.items;
  } else if (data.items) {
    commentList = data.items;
  }

  console.log('评论列表长度:', commentList.length);

  commentList.forEach((item, index) => {
    try {
      let comment = {
        id: generateId(),
        text: '',
        user_name: '匿名用户',
        create_time: '',
        like_count: 0,
        reply_count: 0
      };

      // 尝试多种字段名
      if (item.content || item.text) {
        comment.text = item.content || item.text;
      } else if (item.comment && (item.comment.content || item.comment.text)) {
        comment.text = item.comment.content || item.comment.text;
      }

      if (item.user_name || item.nickname || item.user) {
        comment.user_name = item.user_name || item.nickname || (item.user ? item.user.name : '匿名用户');
      } else if (item.comment && (item.comment.user_name || item.comment.nickname || item.comment.user)) {
        comment.user_name = item.comment.user_name || item.comment.nickname || (item.comment.user ? item.comment.user.name : '匿名用户');
      }

      if (item.create_time || item.time || item.publish_time) {
        comment.create_time = item.create_time || item.time || item.publish_time;
      } else if (item.comment && (item.comment.create_time || item.comment.time || item.comment.publish_time)) {
        comment.create_time = item.comment.create_time || item.comment.time || item.comment.publish_time;
      }

      if (item.like_count || item.digg_count || item.likes) {
        comment.like_count = item.like_count || item.digg_count || item.likes;
      } else if (item.comment && (item.comment.like_count || item.comment.digg_count || item.comment.likes)) {
        comment.like_count = item.comment.like_count || item.comment.digg_count || item.comment.likes;
      }

      if (item.reply_count || item.comments_count) {
        comment.reply_count = item.reply_count || item.comments_count;
      } else if (item.comment && (item.comment.reply_count || item.comment.comments_count)) {
        comment.reply_count = item.comment.reply_count || item.comment.comments_count;
      }

      // 过滤掉空评论
      if (comment.text) {
        comments.push(comment);
        if (index < 5) {
          console.log('解析到评论:', comment.text.substring(0, 50), '...');
        }
      }
    } catch (e) {
      console.error('解析评论时出错:', e);
    }
  });

  return comments;
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 导出数据为不同格式
function downloadData(data, format) {
  try {
    const articleInfo = extractArticleInfo();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filename = `toutiao-comments-${timestamp}`;
    let content = '';

    // 根据格式生成内容
    if (format === 'json') {
      filename += '.json';
      content = JSON.stringify({
        article: articleInfo,
        comments: data,
        total: data.length,
        exported_at: new Date().toISOString()
      }, null, 2);
    } else if (format === 'csv') {
      filename += '.csv';
      // 生成CSV头部
      content = 'ID,用户名,评论内容,创建时间,点赞数,回复数\n';
      // 生成CSV内容
      data.forEach(comment => {
        // 处理CSV中的特殊字符
        const escapedText = comment.text.replace(/"/g, '""').replace(/\n/g, ' ');
        const escapedUserName = comment.user_name.replace(/"/g, '""');
        content += `"${comment.id}","${escapedUserName}","${escapedText}","${comment.create_time}",${comment.like_count},${comment.reply_count}\n`;
      });
    } else if (format === 'md') {
      // 生成文件名：网页标题_正文及评论.md
      const safeTitle = articleInfo.title.replace(/[<>:"/\\|?*]/g, '_');
      filename = `${safeTitle}_正文及评论.md`;
      // 生成Markdown内容
      content = `# 正文及评论\n\n`;
      content += `## 共有评论${data.length}条\n\n`;
      
      data.forEach((comment, index) => {
        content += `${comment.text}\n\n`;
        // 不是最后一条评论时添加分割线
        if (index < data.length - 1) {
          content += `---\n\n`;
        }
      });
    }

    console.log('准备下载文件:', filename);
    console.log('文件内容长度:', content.length);

    // 检查数据是否为空
    if (data.length === 0) {
      updateStatus('没有评论数据可导出');
      return;
    }

    // 使用background script下载文件
    chrome.runtime.sendMessage({
      action: 'download',
      filename: filename,
      content: content,
      format: format
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('发送消息失败:', chrome.runtime.lastError);
        updateStatus(`导出 ${format.toUpperCase()} 文件失败: ${chrome.runtime.lastError.message}`);
      } else if (response && response.success) {
        console.log('下载请求已发送成功');
        updateStatus(`导出 ${format.toUpperCase()} 文件成功`);
      } else {
        console.error('下载请求发送失败:', response ? response.error : '未知错误');
        updateStatus(`导出 ${format.toUpperCase()} 文件失败: ${response ? response.error : '未知错误'}`);
      }
    });
  } catch (e) {
    console.error('导出数据时出错:', e);
    updateStatus(`导出文件失败: ${e.message}`);
  }
}

// 从页面DOM中提取评论
function extractCommentsFromDOM() {
  const comments = [];
  console.log('开始从DOM中提取评论');

  // 1. 尝试找到评论容器
  const commentContainers = findCommentContainers();
  console.log(`找到 ${commentContainers.length} 个评论容器`);

  // 2. 如果找到评论容器，从容器中提取评论
  if (commentContainers.length > 0) {
    commentContainers.forEach(container => {
      const extractedComments = extractCommentsFromContainer(container);
      comments.push(...extractedComments);
    });
  }

  // 3. 如果没有找到评论，尝试备用方法
  if (comments.length === 0) {
    console.log('尝试备用方法提取评论...');
    const backupComments = extractCommentsBackup();
    comments.push(...backupComments);
  }

  console.log('从DOM中提取完成，共获取到', comments.length, '条评论');
  return comments;
}

// 寻找评论容器
function findCommentContainers() {
  const containers = [];
  const selectors = [
    '[class*="comment-list"]',
    '[class*="commentList"]',
    '[class*="comments"]',
    '[id*="comment"]',
    '[class*="reply-list"]',
    '[class*="replyList"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (!containers.includes(el)) {
        containers.push(el);
      }
    });
  });
  
  return containers;
}

// 从评论容器中提取评论
function extractCommentsFromContainer(container) {
  const comments = [];
  const commentItems = container.querySelectorAll('[class*="comment-item"], [class*="commentItem"], [class*="reply-item"], [class*="replyItem"]');
  
  console.log(`在容器中找到 ${commentItems.length} 个评论项`);
  
  commentItems.forEach((item, index) => {
    try {
      const comment = parseCommentItem(item);
      if (comment && comment.text && comment.text.length > 10) {
        // 检查是否重复
        const isDuplicate = comments.some(c => c.text === comment.text);
        if (!isDuplicate) {
          comments.push(comment);
          console.log(`提取到评论 ${index + 1}:`, comment.text.substring(0, 50), '...');
        }
      }
    } catch (e) {
      console.error('解析评论项时出错:', e);
    }
  });
  
  return comments;
}

// 解析单个评论项
function parseCommentItem(item) {
  const comment = {
    id: generateId(),
    text: '',
    user_name: '匿名用户',
    create_time: '',
    like_count: 0,
    reply_count: 0
  };
  
  // 提取评论文本
  const textSelectors = [
    '[class*="comment-content"]',
    '[class*="commentContent"]',
    '[class*="content-text"]',
    '[class*="contentText"]',
    'p'
  ];
  
  for (const selector of textSelectors) {
    const el = item.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      if (text.length > 10) {
        comment.text = text;
        break;
      }
    }
  }
  
  // 如果没有找到，尝试直接获取item的文本
  if (!comment.text) {
    const text = item.textContent.trim();
    if (text.length > 10 && text.length < 500) {
      comment.text = text;
    }
  }
  
  // 提取用户名
  const userSelectors = [
    '[class*="user-name"]',
    '[class*="userName"]',
    '[class*="nickname"]',
    '[class*="author"]'
  ];
  
  for (const selector of userSelectors) {
    const el = item.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      if (text && text.length < 50) {
        comment.user_name = text;
        break;
      }
    }
  }
  
  // 提取时间
  const timeSelectors = [
    '[class*="time"]',
    '[class*="date"]',
    '[class*="publish-time"]'
  ];
  
  for (const selector of timeSelectors) {
    const el = item.querySelector(selector);
    if (el) {
      comment.create_time = el.textContent.trim();
      break;
    }
  }
  
  // 提取点赞数
  const likeSelectors = [
    '[class*="like-count"]',
    '[class*="likeCount"]',
    '[class*="digg-count"]',
    '[class*="praise"]'
  ];
  
  for (const selector of likeSelectors) {
    const el = item.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      const match = text.match(/\d+/);
      if (match) {
        comment.like_count = parseInt(match[0]);
        break;
      }
    }
  }
  
  return comment;
}

// 备用评论提取方法
function extractCommentsBackup() {
  const comments = [];
  console.log('使用备用方法提取评论');
  
  // 寻找所有可能包含评论的元素
  const allElements = document.querySelectorAll('div, p, span');
  const potentialComments = [];
  
  allElements.forEach(el => {
    const text = el.textContent.trim();
    const className = el.className.toLowerCase();
    
    // 更严格的条件
    if (text.length > 15 && text.length < 500) {
      // 检查是否是评论特征
      const isComment = (
        className.includes('comment') ||
        className.includes('reply') ||
        (text.includes('回复') && text.length > 20) ||
        (text.includes('赞') && text.length > 20)
      );
      
      // 过滤掉明显不是评论的内容
      const isNotComment = (
        text.includes('广告') ||
        text.includes('推广') ||
        text.includes('关注') ||
        text.includes('收藏') ||
        text.includes('分享') ||
        text.includes('下载') ||
        text.includes('安装') ||
        text.includes('注册') ||
        text.includes('登录') ||
        text.includes('头条') ||
        text.includes('今日头条') ||
        text.includes('http') ||
        text.includes('www.')
      );
      
      if (isComment && !isNotComment) {
        potentialComments.push({
          element: el,
          text: text
        });
      }
    }
  });
  
  // 去重并提取
  const seenTexts = new Set();
  potentialComments.forEach(pc => {
    if (!seenTexts.has(pc.text)) {
      seenTexts.add(pc.text);
      comments.push({
        id: generateId(),
        text: pc.text,
        user_name: '匿名用户',
        create_time: '',
        like_count: 0,
        reply_count: 0
      });
    }
  });
  
  return comments;
}

// 计算字符串相似度的辅助函数（Levenshtein距离）
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // 初始化第一行和第一列
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // 填充矩阵
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// 开始抓取评论
async function startCrawlProcess() {
  const articleInfo = extractArticleInfo();

  updateStatus('开始抓取评论...');

  let allComments = [];

  // 1. 尝试从DOM中提取评论
  updateStatus('尝试从页面中提取评论...');
  const domComments = extractCommentsFromDOM();
  allComments.push(...domComments);

  if (allComments.length > 0) {
    updateStatus(`从页面中获取到 ${allComments.length} 条评论`);
  }

  // 2. 如果DOM提取失败且有文章ID，尝试API
  if (allComments.length === 0 && articleInfo.article_id) {
    updateStatus('从页面提取失败，尝试使用API...');

    let offset = 0;
    const countPerPage = 20;
    let hasMore = true;
    // 尝试多个可能的API端点
    const apiEndpoints = [
      "https://www.toutiao.com/article/v4/tab_comments/",
      "https://www.toutiao.com/api/comment/list/",
      "https://www.toutiao.com/api/article/comment/list/"
    ];
    let currentEndpoint = 0;

    while (hasMore && currentEndpoint < apiEndpoints.length) {
      const baseApiUrl = apiEndpoints[currentEndpoint];
      const apiUrl = `${baseApiUrl}?aid=24&app_name=toutiao_web&offset=${offset}&count=${countPerPage}&group_id=${articleInfo.article_id}&item_id=${articleInfo.article_id}`;

      try {
        updateStatus(`正在获取第 ${Math.floor(offset / countPerPage) + 1} 页评论...`);
        console.log('请求API:', apiUrl);

        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': articleInfo.url,
            'X-Requested-With': 'XMLHttpRequest',
            'Cookie': document.cookie  // 添加当前页面的Cookie
          },
          credentials: 'include'  // 包含凭证
        });

        console.log('API响应状态码:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('API响应数据:', data);

          const pageComments = parseCommentResponse(data);
          console.log('解析到的评论数:', pageComments.length);

          allComments.push(...pageComments);

          // 尝试多种方式获取has_more
          hasMore = data.has_more || data.hasMore || data.more || false;
          if (typeof hasMore === 'number') {
            hasMore = !!hasMore;
          }

          updateStatus(`已获取 ${allComments.length} 条评论，是否还有更多: ${hasMore}`);
          console.log('是否还有更多评论:', hasMore);

          if (!pageComments.length) {
            // 如果当前端点没有返回评论，尝试下一个端点
            currentEndpoint++;
            offset = 0; // 重置偏移量
            if (currentEndpoint < apiEndpoints.length) {
              updateStatus(`尝试使用第 ${currentEndpoint + 1} 个API端点...`);
            } else {
              hasMore = false;
            }
          } else {
            offset += countPerPage;
            // 每100条评论暂停1秒，防止封禁
            if (allComments.length % 100 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } else {
          updateStatus(`API请求失败，状态码: ${response.status}`);
          console.log('API请求失败，状态码:', response.status);
          // 尝试下一个端点
          currentEndpoint++;
          offset = 0;
          if (currentEndpoint < apiEndpoints.length) {
            updateStatus(`尝试使用第 ${currentEndpoint + 1} 个API端点...`);
          } else {
            hasMore = false;
          }
        }
      } catch (e) {
        updateStatus(`请求API时出错: ${e.message}`);
        console.error('请求API时出错:', e);
        // 尝试下一个端点
        currentEndpoint++;
        offset = 0;
        if (currentEndpoint < apiEndpoints.length) {
          updateStatus(`尝试使用第 ${currentEndpoint + 1} 个API端点...`);
        } else {
          hasMore = false;
        }
      }
    }
  } else if (allComments.length === 0 && !articleInfo.article_id) {
    updateStatus('无法获取文章ID，已尝试从页面提取评论');
  }

  // 去重处理
  const uniqueComments = [];
  const seenTexts = new Set();

  allComments.forEach(comment => {
    // 对评论文本进行标准化处理，提高去重准确性
    const normalizedText = comment.text.trim().replace(/\s+/g, ' ');
    if (!seenTexts.has(normalizedText)) {
      seenTexts.add(normalizedText);
      uniqueComments.push(comment);
    }
  });

  updateStatus(`总共获取到 ${uniqueComments.length} 条评论`);
  console.log('去重前评论数:', allComments.length);
  console.log('去重后评论数:', uniqueComments.length);

  // 保存评论数据到全局变量
  window.toutiaoComments = uniqueComments;

  // 更新导出按钮状态 - 只要有评论就启用导出
  if (uniqueComments.length > 0) {
    document.getElementById('export-json').disabled = false;
    document.getElementById('export-csv').disabled = false;
    document.getElementById('export-md').disabled = false;

    // 抓取完成后自动导出为MD文件
    setTimeout(() => {
      downloadData(uniqueComments, 'md');
    }, 1000);
  }
}

// 更新状态信息
function updateStatus(message) {
  const statusElement = document.getElementById('crawl-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
  console.log('Status:', message);
}

// 创建圆形图标
function createFloatingIcon() {
  // 检查是否已经存在图标
  if (document.getElementById('toutiao-comment-scraper-icon')) {
    return;
  }

  // 创建圆形图标
  const icon = document.createElement('div');
  icon.id = 'toutiao-comment-scraper-icon';
  icon.className = 'toutiao-comment-scraper-icon';
  icon.textContent = '评';
  
  // 添加到页面
  document.body.appendChild(icon);
  
  // 绑定点击事件
  icon.addEventListener('click', () => {
    const panel = document.getElementById('toutiao-comment-scraper');
    if (panel) {
      if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        icon.style.display = 'none';
      } else {
        panel.style.display = 'none';
        icon.style.display = 'flex';
      }
    }
  });
  
  // 添加拖拽功能
  makeDraggable(icon);
}

// 创建控制面板
function createControlPanel() {
  // 检查是否已经存在控制面板
  if (document.getElementById('toutiao-comment-scraper')) {
    return;
  }

  // 创建控制面板容器
  const panel = document.createElement('div');
  panel.id = 'toutiao-comment-scraper';
  panel.className = 'toutiao-comment-scraper';

  // 控制面板HTML
  panel.innerHTML = `
    <div class="scraper-header" id="scraper-header">
      <h3>头条评论提取器</h3>
      <button id="toggle-panel" class="toggle-btn">×</button>
    </div>
    <div class="scraper-content" id="scraper-content">
      <div class="scraper-info">
        <p>当前页面: <span id="current-url">${window.location.href}</span></p>
        <p>文章标题: <span id="article-title">${extractArticleInfo().title}</span></p>
      </div>
      <div class="scraper-actions">
        <button id="start-crawl" class="action-btn primary">开始抓取评论</button>
        <div class="status" id="crawl-status">准备就绪</div>
      </div>
      <div class="scraper-exports" id="scraper-exports">
        <button id="export-json" class="action-btn" disabled>导出JSON</button>
        <button id="export-csv" class="action-btn" disabled>导出CSV</button>
        <button id="export-md" class="action-btn" disabled>导出MD</button>
      </div>
      <div class="scraper-footer">
        <p>头条评论提取器 v1.0</p>
      </div>
    </div>
  `;

  // 添加到页面
  document.body.appendChild(panel);

  // 绑定事件
  document.getElementById('toggle-panel').addEventListener('click', () => {
    const icon = document.getElementById('toutiao-comment-scraper-icon');
    panel.style.display = 'none';
    if (icon) {
      icon.style.display = 'flex';
    }
  });
  document.getElementById('start-crawl').addEventListener('click', startCrawlProcess);
  document.getElementById('export-json').addEventListener('click', () => downloadData(window.toutiaoComments || [], 'json'));
  document.getElementById('export-csv').addEventListener('click', () => downloadData(window.toutiaoComments || [], 'csv'));
  document.getElementById('export-md').addEventListener('click', () => downloadData(window.toutiaoComments || [], 'md'));

  // 添加拖拽功能
  makeDraggable(panel);
}

// 切换控制面板展开/折叠
function togglePanel() {
  const content = document.getElementById('scraper-content');
  const button = document.getElementById('toggle-panel');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    button.textContent = '▼';
  } else {
    content.style.display = 'none';
    button.textContent = '▶';
  }
}

// 使控制面板可拖拽
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = document.getElementById('scraper-header');

  if (header) {
    header.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// 初始化插件
function initPlugin() {
  // 检查是否已经存在图标
  if (document.getElementById('toutiao-comment-scraper-icon')) {
    return;
  }

  // 先创建圆形图标
  createFloatingIcon();
  
  // 再创建控制面板（默认隐藏）
  createControlPanel();

  // 自动提取文章信息
  const articleInfo = extractArticleInfo();
  if (articleInfo) {
    updateStatus(`已识别文章: ${articleInfo.title}`);
  }
}

// 页面加载完成后初始化插件
window.addEventListener('load', initPlugin);

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'check-page') {
    sendResponse({ isToutiaoPage: window.location.hostname === 'www.toutiao.com' });
  }
});