const fs = require('fs');
const path = require('path');
const crx = require('crx');

// 创建CRX实例
const archive = new crx({
  privateKey: fs.readFileSync(path.join(__dirname, 'key.pem'))
});

// 从目录打包
archive.load(path.join(__dirname))
  .then(ext => {
    return ext.pack();
  })
  .then(crxBuffer => {
    fs.writeFileSync(path.join(__dirname, '头条评论及正文提取器v1.0.crx'), crxBuffer);
    console.log('CRX file generated successfully!');
  })
  .catch(err => {
    console.error('Error generating CRX file:', err);
  });