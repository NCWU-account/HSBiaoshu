const fs = require('node:fs/promises');
const path = require('node:path');
const { dialog } = require('electron');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const supportedExtensions = new Set(['.txt', '.md', '.docx', '.pdf']);

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return fs.readFile(filePath, 'utf-8');
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === '.pdf') {
    const data = await fs.readFile(filePath);
    const result = await pdfParse(data);
    return result.text;
  }

  throw new Error('暂不支持该文件格式');
}

function createFileService() {
  return {
    async importDocument() {
      const result = await dialog.showOpenDialog({
        title: '选择招标文件',
        properties: ['openFile'],
        filters: [
          { name: '招标文件', extensions: ['pdf', 'docx', 'txt', 'md'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: '已取消选择' };
      }

      const filePath = result.filePaths[0];
      const ext = path.extname(filePath).toLowerCase();

      if (!supportedExtensions.has(ext)) {
        return { success: false, message: '仅支持 PDF、DOCX、TXT、Markdown 文件' };
      }

      const fileContent = (await extractText(filePath)).trim();

      if (!fileContent) {
        return { success: false, message: '未提取到有效文本，请检查文件内容' };
      }

      return {
        success: true,
        message: '文件解析完成',
        file_content: fileContent,
        file_name: path.basename(filePath),
      };
    },
  };
}

module.exports = {
  createFileService,
};
