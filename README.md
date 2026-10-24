# Epiphany0v0's Blog

一个基于 [Hugo](https://gohugo.io/) 和 [hugo-theme-stack](https://github.com/CaiJimmy/hugo-theme-stack) 搭建的静态博客。

仓库内包含：

- 博客站点配置
- 文章与独立页面内容
- 少量自定义样式
- 私密文章前端解密功能

## Tech Stack

- Static Site Generator: Hugo
- Theme: `github.com/CaiJimmy/hugo-theme-stack/v3`
- Comments: Utterances

## Project Structure

```text
.
├─ assets/                  # 自定义图片、图标、SCSS
│  └─ scss/custom.scss      # 自定义样式
├─ config/_default/         # Hugo 主配置
├─ content/
│  ├─ page/                 # 独立页面，如 about、archives、search
│  └─ post/                 # 博客文章
├─ layouts/                 # 对主题的模板覆盖
├─ scripts/                 # 本地辅助脚本
├─ static/                  # 直接输出的静态资源
└─ .github/workflows/       # 仓库工作流
```

## Writing Notes

这个仓库主要是博客内容源文件，不是面向外部用户的一键部署模板。

如果只是阅读结构，大致关注这几个目录即可：

- `content/post/`: 文章
- `content/page/`: 独立页面
- `layouts/`: 模板覆盖
- `assets/scss/custom.scss`: 自定义样式
- `scripts/Protect-PrivateArticle.ps1`: 私密文章加密脚本

## Create a New Post

本项目的文章采用 Hugo page bundle 结构，通常每篇文章一个文件夹，里面至少有一个 `index.md`。

可以手动创建：

```text
content/post/my-post/
├─ index.md
└─ cover.jpg
```

一个最小可用的文章示例：

```yaml
---
title: 我的新文章
slug: my-new-post
date: 2026-06-13
description: 这是一篇测试文章
image: cover.jpg
toc: true
tags:
  - Hugo
  - Blog
categories:
  - Notes
---

## 一级小节

这里是正文内容。
```

### 必须写 slug

Hugo 在 page bundle（`index.md`）里如果没写 `slug`，`:slug` 会退化成标题生成的 slug，
中文标题最终变成 `/p/%E6%89%8B%E6%9C%BA...` 这种一长串百分号，分享出去又长又不好看。
所以每篇文章都要显式写一个 ASCII 的 `slug`（`permalinks.toml` 里 post 用的是 `/p/:slug/`）。

改 `slug` 会换掉已经分享出去的旧链接，所以顺手把旧地址写进 `aliases`，Hugo 会生成跳转页：

```yaml
slug: phone-esim-not-ready
aliases: ["/p/手机不认我的esim卡了一个0引发的惨案/"]
```

漏写 `slug` 时构建日志里会出现 `WARN  post "标题" 没有设置 slug …` 的提醒（见 `layouts/partials/head/custom.html`）。

### 标题从 ## 起，目录才好看

`markup.toml` 里 `tableOfContents.startLevel = 2`，也就是目录从二级标题开始收集。
正文里不要再写 `#` 一级标题（页面标题本身就是 h1），小节统一用 `##`、子小节用 `###`，
需要目录的长文再加 `toc: true`。

## Create a New Page

独立页面放在 `content/page/` 下，例如：

- `content/page/about/index.md`
- `content/page/archives/index.md`
- `content/page/search/index.md`

示例：

```yaml
---
title: Demo Page
slug: demo
layout: page
---
```

## Private Article

本仓库的私密文章不是“把明文正文隐藏起来”，而是“只发布密文，浏览器端输入密码后再解密”。这能避免：

- 明文正文出现在生成后的 HTML
- 明文密码或密码哈希出现在公开仓库
- 站内搜索和 RSS 直接收录私密文章正文

### Important Rules

如果仓库是公开的，必须遵守这几条：

- 不要在私密文章的 `index.md` 正文里写明文内容
- 不要再使用旧的 `password` 或 `passwordHash` front matter 方案
- 私密文章的明文草稿应放在仓库外，或放在已忽略的 `.private-drafts/` 目录中
- 给私密文章使用足够强的密码，否则密文仍可能被离线暴力尝试

### Authoring Workflow

1. 在 `.private-drafts/` 下写私密文章草稿，例如：

```text
.private-drafts/my-secret.md
```

2. 用脚本把草稿加密成 front matter 片段：

```powershell
.\scripts\Protect-PrivateArticle.ps1 `
  -InputFile .\.private-drafts\my-secret.md `
  -Password "your-strong-password" `
  -Format markdown
```

如果本机的 PowerShell 执行策略拦截脚本，可以改用：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Protect-PrivateArticle.ps1 `
  -InputFile .\.private-drafts\my-secret.md `
  -Password "your-strong-password" `
  -Format markdown
```

3. 新建或编辑文章的 `index.md`，只保留公开元数据，把脚本输出粘进去

4. 私密文章的正文留空，不要把明文正文提交进仓库

### Example

私密文章的 `index.md` 应该类似这样：

```yaml
---
title: 私密文章示例
date: 2026-06-13
description: 这是一篇受密码保护的文章
private: true
passwordHint: "提示文字，可选"
privateMessage: "这篇文章需要输入密码后才能解密查看。"
privateFormat: markdown
privateIterations: 310000
privateSalt: "base64_salt_here"
privateIv: "base64_iv_here"
privateCiphertext: "base64_ciphertext_here"
---
```

### Script Parameters

`scripts/Protect-PrivateArticle.ps1` 支持：

- `-InputFile`: 明文草稿文件路径，必填
- `-Password`: 解密密码，必填
- `-Format`: `markdown` 或 `html`，默认 `markdown`
- `-Iterations`: PBKDF2 迭代次数，默认 `310000`
- `-OutputFile`: 可选，把生成的 front matter 片段写到文件

示例：

```powershell
.\scripts\Protect-PrivateArticle.ps1 `
  -InputFile .\.private-drafts\my-secret.html `
  -Password "another-strong-password" `
  -Format html `
  -OutputFile .\private-snippet.txt
```

### Format Notes

- `markdown` 模式会在浏览器中渲染常见 Markdown 语法，适合普通文章
- `html` 模式会直接把解密后的内容当作 HTML 插入页面，适合你想完全控制输出时使用
- 由于正文是在浏览器端解密后再渲染，Hugo 的服务端能力不会作用于私密正文本身，例如 TOC、服务端高亮、站内搜索正文收录等

### Security Note

这是适合公开静态仓库的“前端解密”方案，安全性明显高于把正文或密码直接放进仓库，但它依然不是服务端鉴权系统。

它适合：

- 熟人分享
- 不希望被随手查看源码就拿到正文的文章
- 公开仓库下的轻量私密访问

它不适合：

- 真正高敏感数据
- 需要强身份认证的内容
- 需要防止暴力尝试的高价值目标

## Custom Styles

当前自定义样式集中在：

- `assets/scss/custom.scss`

例如现有功能包括：

- `spoiler` 抹黑文本效果
- 私密文章密码输入卡片样式

正文里可直接使用：

```html
这是一段普通文字，但这里有 <span class="spoiler">一个隐藏内容</span>。
```

## 分享缩略图（og:image）

- 文章写了 `image`，Stack 会把同一张图用作文章头图、列表缩略图和 `og:image` / `twitter:image`
- 没写 `image` 的页面（首页、about、archives、部分文章）统一用默认图：
  `config/_default/params.toml` 里的 `[defaultImage.opengraph]` → `assets/img/opengraph.png`（1200×630）
- `layouts/partials/head/opengraph/provider/` 下覆盖了主题模板，把属性拼装从 `printf "%q"` 换成
  常规写法，否则标题里带英文引号时（例如 `一个"0"引发的惨案`）会把 `content="…"` 提前截断

## 联系方式（邮箱防混淆）

Cloudflare 的 Scrape Shield 会把页面里的明文邮箱替换成 `[email protected]` 占位符，
在禁用 JS 的环境里访客只能看到这串东西。仓库里用一个短代码绕开它：

```markdown
*   **邮箱:** {{< email "someone@example.com" >}}
```

`layouts/shortcodes/email.html` 会做三件事：

1. HTML 源码里不出现完整明文邮箱，也不出现 `mailto:`，CF 的边缘脚本无从下手；
2. 用户名与域名分别 base64 后放进 `data-*`，由带 `data-cfasync="false"` 的内联脚本解码成
   可点击的 `mailto:` 链接和「复制」按钮（不会被 Rocket Loader 延后）；
3. `<noscript>` 里给出拆开的可读文本，禁用 JS 时依然能看、能手动复制。

如果想彻底不折腾，也可以在 Cloudflare 面板关掉 Scrape Shield → Email Address Obfuscation。

## Site Configuration

主要配置文件位于 `config/_default/`：

- `config.toml`: 站点基础配置（`baseurl` 用中文域名的 punycode 写法 `blog.xn--cdus75j.top`，
  直接写 `blog.顿悟.top` 会让 Hugo 把 host 也百分号编码，`canonical` / `og:image` 会变成抓不到的地址）
- `params.toml`: 主题参数、组件、评论系统等
- `menu.toml`: 社交链接与菜单
- `markup.toml`: Markdown 渲染、代码高亮、目录等
- `permalinks.toml`: URL 规则
- `related.toml`: 相关文章规则
- `module.toml`: Hugo Modules 主题依赖

## Comments

当前评论系统为 waline，相关配置位于：

```text
config/_default/params.toml
```

如果需要切换到 Giscus、Waline、Twikoo 等，也是在这个文件里改。

## License

博客文章默认声明见站点配置，当前为：

```text
CC BY-NC-SA 4.0
```

代码和配置如无额外说明，默认按仓库自身许可处理。
