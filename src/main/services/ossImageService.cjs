/**
 * OSS 图片上传服务
 *
 * 负责将企业图片上传到阿里云 OSS
 */

const crypto = require('node:crypto');

function text(value) {
  return String(value ?? '').trim();
}

function requiredEnv(name) {
  const value = text(process.env[name]);
  if (!value) {
    throw new Error(`缺少 ${name}，无法上传图片。`);
  }
  return value;
}

function hmac(key, data, encoding) {
  return crypto.createHmac('sha1', key).update(data).digest(encoding);
}

function buildOssAuthorization({ method, contentMd5, contentType, date, resource, accessKeyId, accessKeySecret }) {
  const stringToSign = [method, contentMd5, contentType, date, resource].join('\n');
  return `OSS ${accessKeyId}:${hmac(accessKeySecret, stringToSign, 'base64')}`;
}

function generateFilename(originalFilename) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const ext = originalFilename.match(/\.[^.]+$/)?.[0] || '.jpg';
  return `${timestamp}-${random}${ext}`;
}

/**
 * 上传图片到 OSS
 * @param {Object} options - 上传参数
 * @param {string} options.projectId - 企业项目 ID
 * @param {string} options.filename - 原始文件名
 * @param {string} options.mimeType - MIME 类型
 * @param {Buffer} options.buffer - 图片数据
 * @returns {Promise<Object>} 上传结果
 */
async function uploadImage({ projectId, filename, mimeType, buffer }) {
  const region = requiredEnv('ALI_OSS_REGION');
  const bucket = requiredEnv('ALI_OSS_BUCKET');
  const accessKeyId = requiredEnv('ALI_OSS_ACCESS_KEY_ID');
  const accessKeySecret = requiredEnv('ALI_OSS_ACCESS_KEY_SECRET');
  const publicBaseUrl = requiredEnv('ALI_OSS_PUBLIC_BASE_URL').replace(/\/+$/, '');

  const storedFilename = generateFilename(filename);
  const objectKey = `geo-agent/images/${encodeURIComponent(projectId)}/${storedFilename}`;
  const contentType = mimeType || 'image/jpeg';

  const method = 'PUT';
  const contentMd5 = crypto.createHash('md5').update(buffer).digest('base64');
  const date = new Date().toUTCString();
  const host = `${bucket}.${region}.aliyuncs.com`;
  const resource = `/${bucket}/${objectKey}`;
  const authorization = buildOssAuthorization({
    method,
    contentMd5,
    contentType,
    date,
    resource,
    accessKeyId,
    accessKeySecret,
  });

  const response = await fetch(`https://${host}/${objectKey}`, {
    method,
    headers: {
      Authorization: authorization,
      Date: date,
      'Content-Type': contentType,
      'Content-MD5': contentMd5,
      'Content-Disposition': 'inline',
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OSS 上传失败：${response.status} ${errorText.slice(0, 200)}`);
  }

  const url = `${publicBaseUrl}/${objectKey}`;

  return {
    url,
    objectKey,
    filename: storedFilename,
    originalFilename: filename,
    mimeType: contentType,
    fileSize: buffer.length,
  };
}

/**
 * 删除 OSS 图片
 * @param {string} objectKey - OSS 对象 Key
 * @returns {Promise<Object>} 删除结果
 */
async function deleteImage(objectKey) {
  const region = requiredEnv('ALI_OSS_REGION');
  const bucket = requiredEnv('ALI_OSS_BUCKET');
  const accessKeyId = requiredEnv('ALI_OSS_ACCESS_KEY_ID');
  const accessKeySecret = requiredEnv('ALI_OSS_ACCESS_KEY_SECRET');

  const method = 'DELETE';
  const date = new Date().toUTCString();
  const host = `${bucket}.${region}.aliyuncs.com`;
  const resource = `/${bucket}/${objectKey}`;
  const authorization = buildOssAuthorization({
    method,
    contentMd5: '',
    contentType: '',
    date,
    resource,
    accessKeyId,
    accessKeySecret,
  });

  const response = await fetch(`https://${host}/${objectKey}`, {
    method,
    headers: {
      Authorization: authorization,
      Date: date,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OSS 删除失败：${response.status} ${errorText.slice(0, 200)}`);
  }

  return { success: true };
}

/**
 * 获取图片访问 URL
 * @param {string} objectKey - OSS 对象 Key
 * @returns {string} 图片 URL
 */
function getImageUrl(objectKey) {
  const publicBaseUrl = requiredEnv('ALI_OSS_PUBLIC_BASE_URL').replace(/\/+$/, '');
  return `${publicBaseUrl}/${objectKey}`;
}

module.exports = {
  uploadImage,
  deleteImage,
  getImageUrl,
};
