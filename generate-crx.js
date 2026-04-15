const fs = require('fs');
const path = require('path');
const crx = require('crx');

// 项目配置
const projectName = '头条评论提取器';
const version = 'v1.0';
const outputName = `${projectName}${version}`;

// 创建 crx 实例
const crxInstance = new crx({
  privateKey: fs.readFileSync(path.join(__dirname, 'key.pem'))
});

// 打包扩展
crxInstance.load(__dirname)
  .then(() => crxInstance.pack())
  .then((buffer) => {
    // 写入 crx 文件
    fs.writeFileSync(path.join(__dirname, `${outputName}.crx`), buffer);
    console.log(`CRX 文件已生成: ${outputName}.crx`);
    
    // 防杀处理：重命名文件为 .zip 后缀，用户可以手动改回 .crx
    fs.writeFileSync(path.join(__dirname, `${outputName}_crx.zip`), buffer);
    console.log(`防杀处理完成: ${outputName}_crx.zip`);
  })
  .catch((err) => {
    console.error('生成 CRX 文件时出错:', err);
  });
