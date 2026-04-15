// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    // 处理下载请求
    downloadFile(message.filename, message.content, message.format, sendResponse);
    // 保持消息通道开放
    return true;
  }
});

// 下载文件
function downloadFile(filename, content, format, sendResponse) {
  try {
    console.log('开始下载文件:', filename);
    console.log('文件内容长度:', content.length);
    console.log('文件格式:', format);

    // 根据格式设置正确的MIME类型
    let mimeType = 'text/plain';
    if (format === 'md') {
      mimeType = 'text/markdown';
    } else if (format === 'json') {
      mimeType = 'application/json';
    } else if (format === 'csv') {
      mimeType = 'text/csv';
    }

    // 在service worker中，使用data URL的方式
    // 对内容进行Base64编码
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    const dataUrl = `data:${mimeType};base64,${encodedContent}`;

    // 使用chrome.downloads API下载文件
    // saveAs: false 直接保存到默认下载目录
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('下载失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('下载成功，ID:', downloadId);
        sendResponse({ success: true });
      }
    });
  } catch (e) {
    console.error('下载文件时出错:', e);
    sendResponse({ success: false, error: e.message });
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当标签页URL变化且完成加载时
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('toutiao.com')) {
    // 可以在这里添加一些逻辑，比如向content script发送消息
    chrome.tabs.sendMessage(tabId, { action: 'page-updated' });
  }
});