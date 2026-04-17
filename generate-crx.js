const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 插件文件列表
const pluginFiles = [
  'manifest.json',
  'content.js',
  'background.js',
  'popup.html',
  'popup.js',
  'styles.css',
  'icon.svg'
];

// 打包目录
const buildDir = path.join(__dirname, 'build');
const zipName = '头条评论提取器v1.0.zip';
const crxName = '头条评论提取器v1.0.crx';
const crxZipName = '头条评论提取器v1.0_crx.zip';

// 创建构建目录
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

// 复制文件到构建目录
console.log('复制文件到构建目录...');
pluginFiles.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(buildDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`复制 ${file} 成功`);
  } else {
    console.warn(`文件 ${file} 不存在`);
  }
});

// 生成zip文件
console.log('\n生成zip文件...');
try {
  // 使用系统的zip命令
  execSync(`cd ${buildDir} && zip -r ${path.join(__dirname, zipName)} .`);
  console.log(`生成 ${zipName} 成功`);
} catch (error) {
  console.error('生成zip文件失败:', error.message);
}

// 生成crx文件（这里只是重命名zip文件作为模拟）
console.log('\n生成CRX文件...');
try {
  // 复制zip文件并重命名为crx
  const zipPath = path.join(__dirname, zipName);
  const crxPath = path.join(__dirname, crxName);
  fs.copyFileSync(zipPath, crxPath);
  console.log(`生成 ${crxName} 成功`);
  
  // 生成防杀版（重命名为zip）
  const crxZipPath = path.join(__dirname, crxZipName);
  fs.copyFileSync(crxPath, crxZipPath);
  console.log(`生成 ${crxZipName} 成功`);
} catch (error) {
  console.error('生成CRX文件失败:', error.message);
}

console.log('\n打包完成！');
console.log(`生成的文件：`);
console.log(`- ${zipName}`);
console.log(`- ${crxName}`);
console.log(`- ${crxZipName}`);