# UI 与主题更新

基于上游 `b974ff5`（1.7.0），本次只调整展示与主题设置。播放、搜索、账号、歌单、下载、API、插件和原生窗口控制代码保持不变。顶部导航、中间内容和底部播放器使用连续背景，设置页取消外层卡片，保留内部控件分组。

## 使用

打开「设置 → 界面」，直接选择主题预览。保留原有粉、蓝、绿、橙，新增薰衣草、青瓷、琥珀、石墨。所有配色支持「外观」中的浅色、深色和跟随系统，立即保存，无需重启。顶部／侧边导航、播放器布局、字体选择和原有设置仍可使用。

主题使用原来的 `settings.themeColor` 和 `theme` 存储，不需要迁移。新增配色名称和说明覆盖简繁中文、英文、日文、韩文及俄文。

![深色整体界面](ui-preview/settings-dark.png)
![浅色整体界面](ui-preview/settings-light.png)
![首页](ui-preview/home-light.png)

## 实现与兼容性

- 复用现有 Vue、SCSS 和设置动作，未增加依赖、未升级锁文件。
- 原有配色变量保持兼容；新增可读性更好的文字强调色及共享背景变量。
- 去掉深色模式作用于整个 HTML 的亮度滤镜，避免封面变暗和固定定位被滤镜影响。
- 复用同一个系统主题媒体查询对象，保证切换到手动模式后真正解除原来的监听器。
- 主题选择使用原生单选框，可用 Tab 和方向键操作；设置分类使用原生按钮，设置卡片支持键盘激活。
- 支持系统减少动画偏好、强制颜色下的主题选择标记；设置区域有可见滚动条。
- 主应用背景只应用于 HomeLayout，避免污染单独的桌面歌词透明窗口。
- 保留现有桌面最小窗口限制；额外检查 760px Web 窗口。未将本桌面项目改造为完整手机应用。

## 验证记录（2026-09-26）

Windows 上使用仓库锁定的 Electron 39.2.4：

- `npm run build`：通过，生成生产资源和 PWA service worker。
- `npx electron tests/ui-smoke.cjs`：通过。使用独立的内存会话与隐藏的离屏窗口，不读取实际用户账号。
- 覆盖 8 配色 × 浅深色、通过实际设置控件切换、刷新后恢复、原生方向键操作、跟随系统与退出跟随系统。
- 覆盖 1280 / 960 / 760 窗口，主题卡片、播放器与封面边界，侧栏折叠／展开、右侧对齐播放器、首页／发现页导航。
- 播放队列／速度菜单可打开关闭；6 种语言的主题文案和减少动画样式通过检查。
- 人工查看浅深色、窄窗口、侧栏、首页、发现页截图。
- `git diff --check`：通过。

复现方式（推荐 Node 24 LTS；当前系统 Node 26 对 Electron 安装解压出现异常，使用 Node 24 安装成功）：

```sh
npm ci
git submodule update --init --recursive
npm install --prefix api --no-package-lock
# 分别在独立终端运行：
node api/app.js --platform=lite --port=16521
npm run serve -- --host 127.0.0.1
npx electron tests/ui-smoke.cjs
```

测试截图默认保存到系统临时目录的 `moekoe-ui-smoke`，可通过 `UI_TEST_OUTPUT` 指定目录。测试脚本依赖开发服务器提供模块，用于运行期检查；生产产物另经构建验证。

边界：未登录真实酷狗账号，因此未宣称验证付费歌曲、账号认证或云盘写入；未在 macOS/Linux 实机测试、未生成各平台安装包。原版构建也存在 `head.png` 路径提示、大于 500KB 的主包提示和浏览器数据库过期提示，本次未升级依赖或改变这些功能相关配置。

## 调研依据

核对了仓库 README、各语言说明的结构与平台说明、贡献／安全指南、构建脚本、API 子模块说明、最近提交、发布记录与公开问题，并追踪设置存储、主题应用、布局、歌词窗口和播放器样式调用。

- [上游项目](https://github.com/MoeKoeMusic/MoeKoeMusic)
- [1.7.0 发布记录](https://github.com/MoeKoeMusic/MoeKoeMusic/releases/tag/v1.7.0)
- [官方项目说明](https://music.moekoe.cn/)
- [官方字体设置说明](https://music.moekoe.cn/guide/font-settings.html)

官方 changelog 页面读取超时，更新信息以 GitHub Release 与提交记录为准。
