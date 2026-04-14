// 后台脚本

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extractContent') {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        const tab = tabs[0];
        // 向内容脚本发送消息，提取内容
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: extractContentFromPage
        }, function(results) {
          if (results && results[0] && results[0].result) {
            const content = results[0].result;
            // 生成MD格式文件
            const markdown = generateMarkdown(content);
            // 下载文件
            downloadFile(markdown, content.title + '_正文及评论.md', 'text/markdown');
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: '无法提取内容' });
          }
        });
      } else {
        sendResponse({ success: false, error: '没有找到活动标签页' });
      }
    });
    return true; // 表示异步响应
  }
});

// 从页面提取内容的函数
function extractContentFromPage() {
  // 提取文章标题
  let title = document.title;
  if (!title) {
    const titleElement = document.querySelector('h1');
    if (titleElement) {
      title = titleElement.textContent.trim();
    } else {
      title = '未知标题';
    }
  }
  
  // 提取正文内容
  let content = '';
  const contentElements = document.querySelectorAll('article, .article-content, .content, #article-content');
  if (contentElements.length > 0) {
    contentElements.forEach(element => {
      content += element.textContent.trim() + '\n\n';
    });
  } else {
    // 尝试其他可能的选择器
    const paragraphs = document.querySelectorAll('p');
    paragraphs.forEach(p => {
      content += p.textContent.trim() + '\n\n';
    });
  }
  
  // 提取评论
  const comments = [];
  const commentElements = document.querySelectorAll('.comment, .comment-item, .comment-content, .reply-content');
  commentElements.forEach(element => {
    const commentText = element.textContent.trim();
    if (commentText) {
      comments.push(commentText);
    }
  });
  
  return {
    title: title,
    content: content,
    comments: comments
  };
}

// 生成Markdown格式
function generateMarkdown(data) {
  let markdown = `# ${data.title}\n\n`;
  markdown += `# 正文\n\n${data.content}\n`;
  markdown += `# 评论\n\n## 共有评论${data.comments.length}条\n\n`;
  data.comments.forEach(comment => {
    markdown += `${comment}\n\n---\n\n`;
  });
  return markdown;
}

// 下载文件
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  }, function(downloadId) {
    // 释放URL对象
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  });
}