// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('start-extract');
  const statusElement = document.getElementById('status');

  // 点击开始提取按钮
  startButton.addEventListener('click', function() {
    // 显示加载状态
    statusElement.innerHTML = '<div class="loading"></div> 正在提取内容...';
    
    // 向后台脚本发送消息，开始提取
    chrome.runtime.sendMessage({ action: 'extractContent' }, function(response) {
      if (response && response.success) {
        // 显示成功消息
        statusElement.innerHTML = '<span class="success">提取成功！文件已下载</span>';
        // 3秒后清空状态
        setTimeout(() => {
          statusElement.innerHTML = '';
        }, 3000);
      } else {
        // 显示错误消息
        statusElement.innerHTML = '<span class="error">提取失败：' + (response && response.error || '未知错误') + '</span>';
        // 5秒后清空状态
        setTimeout(() => {
          statusElement.innerHTML = '';
        }, 5000);
      }
    });
  });
});