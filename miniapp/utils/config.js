// 接口配置
//
// LOCAL_DEBUG：本地联调开关。
// - 在微信开发者工具里调试时改成 true，小程序会连本机后端（方便看报错日志）；
// - 上传体验版 / 正式版前必须改回 false，否则线上小程序会连不到本地服务。
const LOCAL_DEBUG = false;

// 本地后端地址：后端用 npm run start:dev 启动后默认监听 3000。
// 真机调试时把 127.0.0.1 改成电脑的局域网 IP，例如 http://192.168.1.100:3000。
const LOCAL_BASE_URL = 'http://127.0.0.1:3000';

// 云托管域名（正式环境，保持不变）
const CLOUD_BASE_URL = 'https://restaurant-292415-10-1322144643.sh.run.tcloudbase.com';

const BASE_URL = LOCAL_DEBUG ? LOCAL_BASE_URL : CLOUD_BASE_URL;

module.exports = {
  BASE_URL,
};
