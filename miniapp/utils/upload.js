// 图片上传：后端签发 COS 临时密钥（/admin/cos/sts）→ cos-wx-sdk-v5 直传 COS。
// 上传成功后返回图片 URL（存数据库的仅为 URL）。
const COS = require('../vendor/cos-wx-sdk-v5.js');
const { request } = require('./admin-request');

/**
 * 上传本地图片到 COS
 * @param {string} tempFilePath 本地临时文件路径（wx.chooseMedia 返回）
 * @returns {Promise<string>} 图片 URL
 */
function uploadImage(tempFilePath) {
  return request({ url: '/admin/cos/sts' }).then((sts) => {
    const ext = (tempFilePath.split('.').pop() || 'jpg').toLowerCase();
    const key = `${sts.allowPrefix}${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    return new Promise((resolve, reject) => {
      const cos = new COS({
        getAuthorization: (options, callback) => {
          callback({
            TmpSecretId: sts.tmpSecretId,
            TmpSecretKey: sts.tmpSecretKey,
            SecurityToken: sts.sessionToken,
            StartTime: sts.expiredTime - 1800,
            ExpiredTime: sts.expiredTime,
          });
        },
      });
      cos.uploadFile({
        Bucket: sts.bucket,
        Region: sts.region,
        Key: key,
        FilePath: tempFilePath,
        success: () =>
          resolve(
            `https://${sts.bucket}.cos.${sts.region}.myqcloud.com/${key}`,
          ),
        fail: (err) => reject(new Error(err.message || '上传失败')),
      });
    });
  });
}

module.exports = { uploadImage };
