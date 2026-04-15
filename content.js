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
  // 从URL中提取
  const urlMatch = window.location.href.match(/(group|item)_id=([^&]+)/);
  if (urlMatch && urlMatch[2]) {
    article_id = urlMatch[2];
  }
  // 从页面中提取
  if (!article_id) {
    const metaElement = document.querySelector('meta[name="_oid"]');
    if (metaElement) {
      article_id = metaElement.content;
    }
  }
  // 从script标签中提取
  if (!article_id) {
    const scriptElements = document.querySelectorAll('script');
    for (const script of scriptElements) {
      const scriptContent = script.textContent;
      const match = scriptContent.match(/article_id["']\s*:\s*["']([^"']+)["']/);
      if (match && match[1]) {
        article_id = match[1];
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
      filename += '.md';
      // 生成Markdown内容
      content = `# 今日头条评论提取\n\n`;
      content += `## 文章信息\n\n`;
      content += `- 标题: ${articleInfo.title}\n`;
      content += `- 链接: ${articleInfo.url}\n`;
      content += `- 提取时间: ${new Date().toLocaleString()}\n`;
      content += `- 评论总数: ${data.length}\n\n`;
      content += `## 评论列表\n\n`;
      
      data.forEach((comment, index) => {
        content += `### 评论 ${index + 1}\n\n`;
        content += `**用户名:** ${comment.user_name}\n\n`;
        content += `**评论内容:**\n${comment.text}\n\n`;
        if (comment.create_time) {
          content += `**创建时间:** ${comment.create_time}\n\n`;
        }
        content += `**点赞数:** ${comment.like_count}  **回复数:** ${comment.reply_count}\n\n`;
        content += `---\n\n`;
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

  // 1. 检查页面是否包含iframe
  const iframes = document.querySelectorAll('iframe');
  console.log(`页面包含 ${iframes.length} 个iframe`);

  // 2. 直接搜索页面中所有包含文本的元素
  console.log('直接搜索页面中的文本元素...');
  const allElements = document.querySelectorAll('*');
  console.log(`页面总元素数: ${allElements.length}`);

  // 3. 尝试滚动页面以加载更多内容
  console.log('尝试滚动页面以加载更多评论...');
  let lastScrollHeight = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 20; // 增加滚动次数

  while (scrollAttempts < maxScrollAttempts) {
    window.scrollTo(0, document.body.scrollHeight);
    scrollAttempts++;
    console.log(`第 ${scrollAttempts} 次滚动页面`);

    // 等待页面加载
    let waitTime = 2000; // 增加等待时间
    const start = Date.now();
    while (Date.now() - start < waitTime) {
      // 空循环
    }

    // 检查页面是否停止滚动
    if (document.body.scrollHeight === lastScrollHeight) {
      console.log('页面停止滚动，停止加载更多评论');
      break;
    }
    lastScrollHeight = document.body.scrollHeight;
  }

  // 4. 再次获取所有元素
  const allElementsAfterScroll = document.querySelectorAll('*');
  console.log(`滚动后页面总元素数: ${allElementsAfterScroll.length}`);

  // 5. 提取可能的评论
  console.log('开始提取可能的评论...');
  const textElements = Array.from(allElementsAfterScroll).filter(el => {
    // 过滤掉空文本和太短的文本
    const text = el.textContent.trim();
    return text.length > 5 && !el.tagName.match(/^(SCRIPT|STYLE|META|LINK|TITLE)$/i);
  });

  console.log(`找到 ${textElements.length} 个可能的文本元素`);

  // 6. 分析文本元素，寻找评论模式
  const potentialComments = [];
  textElements.forEach((el, index) => {
    const text = el.textContent.trim();
    const className = el.className;
    const tagName = el.tagName;

    // 检查是否可能是评论
    const isPotentialComment = (
      className.includes('comment') ||
      className.includes('reply') ||
      className.includes('content') ||
      className.includes('item') ||
      text.includes('回复') ||
      text.includes('评论') ||
      text.includes('赞') ||
      text.includes('时间') ||
      text.includes('：') // 中文冒号，可能是用户名和评论的分隔符
    );

    if (isPotentialComment) {
      potentialComments.push({
        text: text,
        className: className,
        tagName: tagName,
        element: el
      });
      if (index < 30) { // 增加打印数量
        console.log(`潜在评论 ${index + 1}:`, text.substring(0, 100), '...');
      }
    }
  });

  console.log(`找到 ${potentialComments.length} 个潜在评论`);

  // 7. 尝试从潜在评论中提取结构化数据
  potentialComments.forEach((potentialComment, index) => {
    try {
      const el = potentialComment.element;
      let text = potentialComment.text;
      let user_name = '匿名用户';
      let create_time = '';
      let like_count = 0;
      let reply_count = 0;

      // 尝试从父元素、祖父元素或兄弟元素中提取用户信息
      let parent = el.parentElement;
      let grandParent = parent ? parent.parentElement : null;
      let prevSibling = el.previousElementSibling;
      let nextSibling = el.nextElementSibling;

      // 尝试提取用户名
      const userContainers = [el, parent, grandParent, prevSibling, nextSibling].filter(Boolean);
      for (const container of userContainers) {
        const userElements = container.querySelectorAll('[class*=user], [class*=name], [class*=nick], [class*=author]');
        if (userElements.length > 0) {
          user_name = userElements[0].textContent.trim();
          break;
        }
      }

      // 尝试提取时间
      for (const container of userContainers) {
        const timeElements = container.querySelectorAll('[class*=time], [class*=date], [class*=publish]');
        if (timeElements.length > 0) {
          create_time = timeElements[0].textContent.trim();
          break;
        }
      }

      // 尝试提取点赞数和回复数
      for (const container of userContainers) {
        const actionElements = container.querySelectorAll('[class*=like], [class*=digg], [class*=reply], [class*=zan], [class*=praise]');
        actionElements.forEach(actionEl => {
          const actionText = actionEl.textContent.trim();
          const match = actionText.match(/\d+/);
          if (match) {
            if (actionText.includes('赞') || actionText.includes('like') || actionText.includes('digg') || actionText.includes('zan') || actionText.includes('praise')) {
              like_count = parseInt(match[0]);
            } else if (actionText.includes('回复') || actionText.includes('reply')) {
              reply_count = parseInt(match[0]);
            }
          }
        });
      }

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
        text.length > 800 // 增加长度限制
      );

      if (!isNotComment) {
        // 检查是否是重复评论（使用更宽松的判断）
        const isDuplicate = comments.some(comment => {
          // 检查文本是否相同，或者相似度很高
          const similarity = levenshteinDistance(comment.text, text) / Math.max(comment.text.length, text.length);
          return similarity < 0.1 || comment.text === text;
        });

        if (!isDuplicate) {
          const comment = {
            id: generateId(),
            text: text,
            user_name: user_name,
            create_time: create_time,
            like_count: like_count,
            reply_count: reply_count
          };
          comments.push(comment);
          console.log('成功提取评论:', comment.text.substring(0, 50), '...');
        }
      }
    } catch (e) {
      console.error('处理潜在评论时出错:', e);
    }
  });

  // 8. 额外尝试：直接从页面中搜索所有文本，寻找评论模式
  console.log('尝试直接从页面中搜索所有文本...');
  const pageText = document.body.textContent;
  const textLines = pageText.split('\n').filter(line => line.trim().length > 10);

  console.log(`页面文本行数: ${textLines.length}`);

  // 尝试识别评论模式
  textLines.forEach((line, index) => {
    const trimmedLine = line.trim();
    // 更宽松的规则：寻找可能的评论行
    const isCommentLike = (
      trimmedLine.includes('回复') ||
      trimmedLine.includes('赞') ||
      trimmedLine.includes('评论') ||
      trimmedLine.includes('：') || // 中文冒号
      (trimmedLine.length > 20 && trimmedLine.length < 500)
    );

    if (isCommentLike) {
      // 检查是否是重复评论
      const isDuplicate = comments.some(comment => {
        const similarity = levenshteinDistance(comment.text, trimmedLine) / Math.max(comment.text.length, trimmedLine.length);
        return similarity < 0.1 || comment.text === trimmedLine;
      });

      if (!isDuplicate) {
        const comment = {
          id: generateId(),
          text: trimmedLine,
          user_name: '匿名用户',
          create_time: '',
          like_count: 0,
          reply_count: 0
        };
        comments.push(comment);
        if (index < 15) {
          console.log('直接提取评论:', trimmedLine.substring(0, 100), '...');
        }
      }
    }
  });

  console.log('从DOM中提取完成，共获取到', comments.length, '条评论');
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

  // 更新导出按钮状态
  document.getElementById('export-json').disabled = false;
  document.getElementById('export-csv').disabled = false;
  document.getElementById('export-md').disabled = false;

  // 抓取完成后自动导出为MD文件
  setTimeout(() => {
    downloadData(uniqueComments, 'md');
  }, 1000);
}

// 更新状态信息
function updateStatus(message) {
  const statusElement = document.getElementById('crawl-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
  console.log('Status:', message);
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
      <button id="toggle-panel" class="toggle-btn">▼</button>
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
  document.getElementById('toggle-panel').addEventListener('click', togglePanel);
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
  // 检查是否已经存在控制面板
  if (document.getElementById('toutiao-comment-scraper')) {
    return;
  }

  // 创建控制面板
  createControlPanel();

  // 自动提取文章信息
  const articleInfo = extractArticleInfo();
  if (articleInfo) {
    updateStatus(`已识别文章: ${articleInfo.title}`);
  }

  // 自动开始抓取
  startCrawlProcess();
}

// 页面加载完成后初始化插件
window.addEventListener('load', initPlugin);

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'check-page') {
    sendResponse({ isToutiaoPage: window.location.hostname === 'www.toutiao.com' });
  }
});