// 后台脚本

// 监听来自content script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'download') {
    const { title, content } = request.data;
    
    // 生成文件名
    const filename = `${title}_正文及评论.md`;
    
    // 下载文件
    downloadFile(content, filename, 'text/markdown');
    
    sendResponse({ success: true });
  } else if (request.action === 'extractContent') {
    // 从popup.js触发的提取请求
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        const tab = tabs[0];
        // 向content script发送消息，触发提取
        chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, function(response) {
          if (response && response.success) {
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: '提取失败' });
          }
        });
      } else {
        sendResponse({ success: false, error: '没有找到活动标签页' });
      }
    });
    return true; // 表示异步响应
  }
});

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