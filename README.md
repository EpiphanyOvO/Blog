# Epiphany0v0's Blog

一个基于 [Hugo](https://gohugo.io/) 和 [hugo-theme-stack](https://github.com/CaiJimmy/hugo-theme-stack) 搭建的静态博客。

仓库内包含：

- 博客站点配置
- 文章与独立页面内容
- 少量自定义样式
- GitHub Pages 自动部署工作流
- 私密文章密码访问功能

## Tech Stack

- Static Site Generator: Hugo
- Theme: `github.com/CaiJimmy/hugo-theme-stack/v3`
- Deployment: GitHub Pages + GitHub Actions
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
├─ static/                  # 直接输出的静态资源
└─ .github/workflows/       # 自动部署和主题更新
```

## Requirements

本地运行前建议准备：

- Hugo Extended
- Go 1.17 或更高版本
- Git

检查版本：

```bash
hugo version
go version
git --version
```

## Local Development

首次拉取后，在项目根目录执行：

```bash
hugo mod tidy
hugo server -D
```

默认本地地址：

```text
http://localhost:1313/
```

说明：

- `hugo mod tidy` 用于拉取并整理主题模块依赖
- `hugo server -D` 会连同草稿文章一起启动本地预览
- 如果你不想预览草稿，可以改用 `hugo server`

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
date: 2026-06-13
description: 这是一篇测试文章
image: cover.jpg
tags:
  - Hugo
  - Blog
categories:
  - Notes
---

这里是正文内容。
```

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

本仓库已支持文章级密码访问。启用后，用户打开文章时需要先输入密码，验证通过后才会显示正文。

### Option 1: Configure a Plain Password

在文章 front matter 中添加：

```yaml
---
title: 私密文章示例
date: 2026-06-13
private: true
password: "123456"
passwordHint: "六位数字"
privateMessage: "这篇文章只给知道口令的人看。"
---
```

字段说明：

- `private`: 是否启用私密文章门禁
- `password`: 文章密码，构建时会转成 SHA-256 哈希用于前端校验
- `passwordHint`: 可选，密码提示
- `privateMessage`: 可选，显示在密码输入框上方的提示文字

### Option 2: Configure a SHA-256 Hash Directly

如果你不希望把明文密码写进仓库，可以直接填写哈希值：

```yaml
---
title: 私密文章示例
date: 2026-06-13
private: true
passwordHash: "your_sha256_hash_here"
---
```

注意：

- `passwordHash` 需要是小写十六进制 SHA-256 值
- `password` 和 `passwordHash` 二选一即可

### Security Note

这是静态站点里的前端密码校验功能，适合做“访问拦截”或“熟人可见”场景，不适合存放真正敏感的数据。

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

## Site Configuration

主要配置文件位于 `config/_default/`：

- `config.toml`: 站点基础配置
- `params.toml`: 主题参数、组件、评论系统等
- `menu.toml`: 社交链接与菜单
- `markup.toml`: Markdown 渲染、代码高亮、目录等
- `permalinks.toml`: URL 规则
- `related.toml`: 相关文章规则
- `module.toml`: Hugo Modules 主题依赖

## Build

生成生产环境静态文件：

```bash
hugo --minify --gc
```

输出目录：

```text
public/
```

## Deployment

本仓库已配置 GitHub Actions 自动部署。

当前流程：

1. 推送到 `master` 分支
2. GitHub Actions 执行 Hugo 构建
3. 构建产物发布到 `gh-pages` 分支
4. GitHub Pages 提供静态站点访问

相关文件：

- `.github/workflows/deploy.yml`
- `.github/workflows/update-theme.yml`

## Comments

当前评论系统为 Utterances，相关配置位于：

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
