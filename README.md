# 词冲

面向高考英语词汇的本地优先背词 App。内置 TypeWords 高考 3500 词表（实际 3875 个词条），支持美式发音、快速判断、拼写加固、生词回流、间隔复习和学习进度统计。

## 运行

```bash
npm install
npm run dev
```

## 主要功能

- 点击发音按钮播放美式词典音频，失败时回退到设备中的 `en-US` 美式语音
- “没记住 / 有点模糊 / 我记住了”三级记忆反馈
- 根据熟悉度自动安排 10 分钟、1 天、3 天、7 天、15 天和 30 天后的复习
- 没记住的单词自动回流本轮队列并加入生词本
- 每个词条使用 TypeWords 释义，并最多展示一条 TypeWords 双语例句
- 完成每日词汇任务后进入集中拼写练习，只显示音标和读音提示
- 当天速记队列和学习位置自动保存，切换页面后继续学习
- 搜索和熟悉度筛选
- 所有学习记录保存在浏览器本地，无需账号
- 配置 Supabase 后支持邮箱账号登录与跨设备云同步

## 开启跨设备同步

1. 在 [Supabase](https://supabase.com/) 创建免费项目。
2. 打开项目的 SQL Editor，运行 [`supabase-schema.sql`](./supabase-schema.sql)。
3. 将 `.env.example` 复制为 `.env.local`，填入项目的 URL 和 publishable/anon key。
4. 重新运行 `npm run dev`。

登录前记录仍保存在浏览器本地；首次登录时，若云端没有记录，会自动上传当前记录。之后每次学习都会先保存到本地，再自动同步到云端。数据库已启用 Row Level Security，每个账号只能访问自己的学习记录。

## 部署到 Vercel

项目已包含 `vercel.json`，可直接导入 Vercel。在 Vercel 项目设置中填写 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，无需把真实值提交到仓库。完整步骤见 [`DEPLOY.md`](./DEPLOY.md)。

## 词表来源

词表直接使用 [TypeWords](https://github.com/zyronon/TypeWords) 的高考 3500 词库，
保留美式音标、结构化中文释义，并为有例句的词条保留一条双语例句。
TypeWords 采用 GPL-3.0 许可，数据文件包含 3875 个词条。

本项目未复制任何商业背词产品的界面或受保护内容。
