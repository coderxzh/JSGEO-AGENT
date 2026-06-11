/**
 * 企业图片管理服务
 *
 * 负责企业图片的增删改查
 */

const crypto = require('node:crypto');
const { getDb } = require('./databaseService.cjs');
const ossImageService = require('./ossImageService.cjs');

/**
 * 上传图片
 * @param {Object} options - 上传参数
 * @param {string} options.projectId - 企业项目 ID
 * @param {string} options.filename - 原始文件名
 * @param {string} options.mimeType - MIME 类型
 * @param {string} options.content - Base64 编码的图片数据
 * @returns {Promise<Object>} 上传结果
 */
async function uploadImage({ projectId, filename, mimeType, content }) {
  if (!projectId) {
    throw new Error('缺少企业项目 ID');
  }

  // 解码 base64 内容
  const base64Data = String(content || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // 上传到 OSS
  const ossResult = await ossImageService.uploadImage({
    projectId,
    filename,
    mimeType,
    buffer,
  });

  // 保存到数据库
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // 获取当前最大排序值
  const maxSort = getDb().prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM enterprise_images WHERE project_id = ?'
  ).get(projectId);

  getDb().prepare(`
    INSERT INTO enterprise_images (
      id, project_id, filename, original_filename, mime_type,
      file_size, oss_url, oss_object_key, sort_order,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    projectId,
    ossResult.filename,
    ossResult.originalFilename,
    ossResult.mimeType,
    ossResult.fileSize,
    ossResult.url,
    ossResult.objectKey,
    (maxSort?.max_sort ?? -1) + 1,
    now,
    now
  );

  return {
    id,
    project_id: projectId,
    filename: ossResult.filename,
    original_filename: ossResult.originalFilename,
    mime_type: ossResult.mimeType,
    file_size: ossResult.fileSize,
    oss_url: ossResult.url,
    oss_object_key: ossResult.objectKey,
    sort_order: (maxSort?.max_sort ?? -1) + 1,
    created_at: now,
    updated_at: now,
  };
}

/**
 * 获取企业图片列表
 * @param {string} projectId - 企业项目 ID
 * @returns {Array} 图片列表
 */
function getImagesByProject(projectId) {
  if (!projectId) {
    return [];
  }

  return getDb().prepare(`
    SELECT * FROM enterprise_images
    WHERE project_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `).all(projectId);
}

/**
 * 获取单个图片
 * @param {string} imageId - 图片 ID
 * @returns {Object|null} 图片信息
 */
function getImage(imageId) {
  return getDb().prepare('SELECT * FROM enterprise_images WHERE id = ?').get(imageId);
}

/**
 * 删除图片
 * @param {string} imageId - 图片 ID
 * @returns {Promise<Object>} 删除结果
 */
async function deleteImage(imageId) {
  const image = getImage(imageId);
  if (!image) {
    throw new Error('图片不存在');
  }

  // 从 OSS 删除文件
  try {
    await ossImageService.deleteImage(image.oss_object_key);
  } catch (error) {
    console.warn('[enterpriseImageService] Failed to delete OSS file:', error.message);
  }

  // 从数据库删除记录
  getDb().prepare('DELETE FROM enterprise_images WHERE id = ?').run(imageId);

  return { success: true };
}

/**
 * 更新图片排序
 * @param {Array} imageIds - 图片 ID 数组（按新顺序排列）
 * @returns {Promise<Object>} 更新结果
 */
async function updateImageSort(imageIds) {
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return { success: true };
  }

  const updateStmt = getDb().prepare('UPDATE enterprise_images SET sort_order = ?, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();

  const transaction = getDb().transaction(() => {
    imageIds.forEach((imageId, index) => {
      updateStmt.run(index, now, imageId);
    });
  });

  transaction();

  return { success: true };
}

/**
 * 删除企业所有图片
 * @param {string} projectId - 企业项目 ID
 * @returns {Promise<Object>} 删除结果
 */
async function deleteAllImages(projectId) {
  if (!projectId) {
    return { success: true };
  }

  const images = getImagesByProject(projectId);

  // 从 OSS 删除所有文件
  for (const image of images) {
    try {
      await ossImageService.deleteImage(image.oss_object_key);
    } catch (error) {
      console.warn('[enterpriseImageService] Failed to delete OSS file:', error.message);
    }
  }

  // 从数据库删除所有记录
  getDb().prepare('DELETE FROM enterprise_images WHERE project_id = ?').run(projectId);

  return { success: true };
}

module.exports = {
  uploadImage,
  getImagesByProject,
  getImage,
  deleteImage,
  updateImageSort,
  deleteAllImages,
};
