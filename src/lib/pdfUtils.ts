/**
 * PDF工具函数 - 精简版本
 * 移除了复杂的PDF自动提取功能，只保留基础验证
 * 
 * 改进原因：
 * - PDF.js在浏览器中渲染大文件时会卡顿
 * - CDN加载Worker文件可能失败
 * - 手动上传封面更简洁可靠
 */

/**
 * 验证是否为有效的PDF文件
 * @param file 文件对象
 * @returns boolean
 */
export function isValidPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * 格式化文件大小显示
 * @param bytes 字节数
 * @returns string 格式化后的大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
