# 文字抹黑效果使用教程
```html

这是一段普通的文字，但这里有 <span class="spoiler">一个隐藏的秘密</span>。

```
# 文章加密使用教程
在你的文章中做加密标记:用{{< secret "password" >}}和{{< /secret >}}包裹住你要加密的帖子。{{< secret "password" >}}前面需要有 例如：

```html

---
title: "example"
date: 2023-07-11T01:53:48+08:00
---

<!--more-->

{{< secret "password" >}}

## hi

### hugoArticleEncryptor is a hugo article encryption tool!

Let's try it.

> hugoArticleEncryptor was inspired by the hugo_encryptor project

{{< /secret >}}

```



