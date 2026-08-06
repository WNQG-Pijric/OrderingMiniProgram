# 本地联调指南（不用云端也能调试）

> 创建：2026-08-06
> 用途：在微信开发者工具里连「本机后端 + 本地数据库」调试，报错信息直接在眼前，不再依赖云端日志。

## 一、当前项目的连接关系

```
小程序（开发者工具）
        │  LOCAL_DEBUG=true 时
        ▼
本机后端（http://127.0.0.1:3000，npm run start:dev）
        │
        ▼
本地 MySQL（Docker 容器 restaurant-mysql，localhost:3306）
```

云端部署不受影响：云托管服务仍然连云端数据库，本地只用于调试。

## 二、步骤 1：确认本地数据库在运行

在项目根目录打开终端，执行：

```bash
docker ps -a --filter name=restaurant-mysql
```

- 状态是 `Up`：直接进行步骤 2。
- 状态是 `Exited`：执行 `docker start restaurant-mysql`。
- 没有这个容器：按 `backend/.env.example` 的连接信息创建（账号 `root`、密码 `restaurant_dev`、库名 `restaurant`、端口 `3306`），也可以让开发助手帮你建。

## 三、步骤 2：初始化本地数据库（第一次或数据库重建时）

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

`backend/.env` 已经指向 `localhost:3306`，不需要改。

## 四、步骤 3：启动本机后端

```bash
cd backend
npm run start:dev
```

看到 `Nest application successfully started` 就说明成功。此时：

- 接口文档：浏览器打开 `http://127.0.0.1:3000/docs`
- 后端报错会直接打印在这个终端里，这是本地调试最重要的日志来源

不要关闭这个终端，后面调试时要一直开着。

## 五、步骤 4：让小程序连本地后端

打开 `miniapp/utils/config.js`，把：

```js
const LOCAL_DEBUG = false;
```

改成：

```js
const LOCAL_DEBUG = true;
```

保存后回到微信开发者工具，点「编译」。

## 六、步骤 5：关闭微信的域名校验

开发者工具右上角「详情」→「本地设置」→ 勾选：

```
不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书
```

因为本地地址是 `http://127.0.0.1`，不勾选会被微信拦截。

## 七、真机调试时怎么改

手机不能访问电脑的 `127.0.0.1`，需要改成电脑在局域网里的 IP：

1. 手机和电脑连同一个 WiFi。
2. Mac 终端执行 `ipconfig getifaddr en0`，会得到一个类似 `192.168.1.100` 的地址。
3. 把 `miniapp/utils/config.js` 里的 `LOCAL_BASE_URL` 改成：

```js
const LOCAL_BASE_URL = 'http://192.168.1.100:3000';
```

4. 重新编译，再点「真机调试」。

## 八、调试时去哪看错误

| 想看什么 | 去哪看 |
|---|---|
| 后端接口报错、堆栈 | 跑 `npm run start:dev` 的终端 |
| 小程序请求是否发出、返回什么 | 开发者工具「调试器」→「Console」和「Network」 |
| 数据库里的数据 | `cd backend && npx prisma studio` |
| 接口参数和返回结构 | `http://127.0.0.1:3000/docs` |

## 九、上传前必须做的收尾

上传体验版或正式版之前，把 `miniapp/utils/config.js` 改回：

```js
const LOCAL_DEBUG = false;
```

否则线上小程序会尝试连你的电脑，导致所有接口失败。

## 十、常见问题

- 小程序一直转圈、Network 显示 `fail`：先确认后端终端是否在运行、没有报错。
- 提示连不上 `127.0.0.1`：后端没启动，或 3000 端口被别的程序占用。
- 提示数据库连接失败：`docker start restaurant-mysql` 后再试。
- 真机调试连不上：检查局域网 IP 是否写对、手机和电脑是否同一个 WiFi、`LOCAL_DEBUG` 是否为 `true`。
- 上传体验版后接口全挂：几乎肯定是 `LOCAL_DEBUG` 忘了改回 `false`。
