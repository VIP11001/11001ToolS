// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');

  // 检查当前标签页是否是今日头条页面
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs.length > 0) {
      const tab = tabs[0];
      if (tab.url && tab.url.includes('toutiao.com')) {
        statusElement.textContent = '当前页面是今日头条文章页面，可以使用提取功能';
      } else {
        statusElement.textContent = '请打开今日头条文章页面使用';
      }
    }
  });
});