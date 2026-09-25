# 月下寄愿

手机优先的中秋祝福网站：匿名发祝福，灯升起，祝福在月色里飘过。

背景音乐使用项目方提供的《三相奇谈》游戏原声音乐 OST。页面不会强制自动播放，访客可通过“音乐”按钮开启或暂停；公开发布前请由项目方确认该音频的使用授权。

## 本地预览

运行 `npm ci`、`npm run dev`。未配置 Supabase 时进入**本地预览模式**：祝福只保存在当前浏览器，用于体验发送、弹幕和列表。页面会明确显示这一状态。

## 接入 Supabase

1. 新建独立 Supabase 项目，在 **Authentication → Providers** 启用 **Anonymous Sign-Ins**。
2. 在 SQL Editor 运行 `supabase/schema.sql`，再用一个普通访客会话验证读取、发送和 15 秒间隔。
3. 复制 `.env.example` 为 `.env.local`，填写项目 URL 与 **publishable** key。不要把 `service_role` 或 secret key 写进前端。
4. 重新运行开发服务器。打开两个浏览器会话，确认一边发送后另一边能收到。

公开发送前建议在 Supabase Authentication 启用机器人验证，并把对应客户端验证码组件接入匿名登录。只有数据库限速无法防止反复创建匿名身份的刷屏。管理人员可在 Dashboard 表编辑器中把不合适的祝福的 `status` 改为 `hidden`；现有访问者最多约 30 秒后不再看到它。

## GitHub Pages

推送到仓库 `main` 分支。在仓库 **Settings → Pages** 选择 **GitHub Actions**，并在 **Settings → Secrets and variables → Actions → Variables** 新增 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。工作流会为 `用户名.github.io` 根站或普通项目仓库计算正确的资源路径，也会在变量缺失时停止部署，避免误上线一个仅当前设备可见的预览版。

这两个变量会打包进公开网页，它们必须是 URL 和 publishable key，不是管理密钥。`service_role`、secret key 或数据库密码绝不能放进 GitHub Pages。

> 2026 年的新 Supabase 项目可能不会自动把新表暴露给 Data API。`supabase/schema.sql` 已显式给 `anon` 与 `authenticated` 授予所需的列级权限，并同时启用 RLS；不要删除其中的 `REVOKE`、`GRANT` 或策略语句。

## 设计约束

- 不预先生成假祝福或假在线人数。首个访客看到空状态。
- 弹幕使用不可见的调度位置、队列、限流和清屏动画；画面不出现轨道线。
- 点击飘过的句子可以读完整内容；没有看到的消息仍能在“今夜的祝福”里查到最近 80 条。
- 尊重系统的减少动态效果偏好；页面也提供手动开关。
