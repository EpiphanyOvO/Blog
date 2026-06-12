/**
 * Markdown 实时预览
 */
import { marked } from 'marked';
import hljs from 'highlight.js';
import { parseFrontMatter } from './frontmatter.js';

// 配置 marked
marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
});

let previewEl = null;
let debounceTimer = null;

/**
 * 初始化预览面板
 */
export function initPreview(el) {
    previewEl = el;
}

/**
 * 更新预览内容（300ms 防抖）
 */
export function updatePreview(markdownContent) {
    if (!previewEl) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        try {
            const { meta, body } = parseFrontMatter(markdownContent);
            if (meta.private && meta.privateCiphertext && !body.trim()) {
                previewEl.innerHTML = `
          <div class="preview-private-card">
            <h3>🔐 私密文章</h3>
            <p>这篇文章的公开仓库版本只会保存密文正文。</p>
            <p>要继续编辑，请在工具栏点击“解锁正文”并输入密码。</p>
          </div>
        `;
                return;
            }
            previewEl.innerHTML = marked.parse(body);
        } catch (e) {
            previewEl.innerHTML = `<p class="preview-error">预览渲染失败: ${e.message}</p>`;
        }
    }, 300);
}
