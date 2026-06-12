# 部署到 Vercel

## 1. 准备 Supabase

1. 创建 Supabase 项目。
2. 在 Supabase SQL Editor 中运行项目根目录的 `supabase-schema.sql`。
3. 在 Supabase 项目的 **Project Settings → API** 中找到：
   - Project URL
   - Publishable key，旧项目可能显示为 anon key

不要使用或公开 `service_role` key。

## 2. 导入 Vercel

1. 将项目推送到 GitHub、GitLab 或 Bitbucket。
2. 在 Vercel 中选择 **Add New → Project**，导入仓库。
3. Vercel 会根据 `vercel.json` 使用 Vite 构建，并输出 `dist` 目录。
4. 在导入页面的 **Environment Variables** 中添加：

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key |

建议同时勾选 Production、Preview 和 Development。环境变量变更后，需要重新部署才能进入新的前端构建。

## 3. 配置 Supabase 登录回调

首次部署成功后，复制 Vercel 的正式域名，例如：

```text
https://your-project.vercel.app
```

打开 Supabase **Authentication → URL Configuration**：

- `Site URL` 设置为正式 Vercel 域名。
- 在 `Redirect URLs` 添加：

```text
http://localhost:4173/**
https://your-project.vercel.app/**
https://*-your-team.vercel.app/**
```

最后一条用于 Vercel Preview 部署。若绑定自定义域名，也需要把它加入 Redirect URLs。

## 4. 上线检查

- 注册新账号并完成邮箱确认。
- 在设备 A 学习一个单词，等待顶部显示“已同步”。
- 在设备 B 登录同一账号，确认学习进度出现。
- 确认 Supabase 表 `learning_states` 已启用 RLS。
