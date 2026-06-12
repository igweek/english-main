# 词冲

面向高考英语词汇的本地优先背词 App。内置高考 3500 行业词表（实际 3893 个词条），支持美式发音、快速判断、拼写加固、生词回流、间隔复习和学习进度统计。

## 运行

```bash
npm install
npm run dev
```

## 主要功能

- 浏览器原生 `SpeechSynthesis` 美式语音，优先选择设备中的 `en-US` 自然语音
- “没记住 / 有点模糊 / 我记住了”三级记忆反馈
- 根据熟悉度自动安排 10 分钟、1 天、3 天、7 天、15 天和 30 天后的复习
- 没记住的单词自动回流本轮队列并加入生词本
- 每个词条自动提供简短语境例句、中文句意和语义记忆图
- 完成每日词汇任务后进入集中拼写练习，只显示音标和读音提示
- 拆分记忆提示、搜索和熟悉度筛选
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

词表来自 [Qwerty Learner](https://github.com/RealKai42/qwerty-learner) 的
[`GaoKao_3500.json`](https://github.com/RealKai42/qwerty-learner/blob/master/public/dicts/GaoKao_3500.json)，
原项目采用 GPL-3.0 许可。行业名称为“高考 3500”，数据文件实际包含 3893 个词条。

本项目未复制任何商业背词产品的界面或受保护内容。
