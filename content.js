// 内容脚本

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extractContent') {
    const content = extractContentFromPage();
    sendResponse(content);
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