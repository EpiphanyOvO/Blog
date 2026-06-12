/**
 * 弹窗组件 — 设置、新建文章、确认删除
 */

/**
 * 创建弹窗框架
 */
function createModalBase(title, body, actions = []) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
    <div class="modal-header">
      <h2>${title}</h2>
      <button class="btn-icon modal-close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-body">${body}</div>
    <div class="modal-actions">
      ${actions.map(a => `<button class="btn ${a.class || ''}" id="${a.id}">${a.label}</button>`).join('')}
    </div>
  `;

    overlay.appendChild(modal);

    // click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal(overlay);
        }
    });

    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(overlay));

    // ESC to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(overlay);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    return { overlay, modal };
}

function closeModal(overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
}

/**
 * 设置弹窗
 */
export function showSettingsModal(currentToken = '') {
    return new Promise((resolve) => {
        const { overlay, modal } = createModalBase(
            '⚙️ 设置',
            `
        <div class="form-group">
          <label for="setting-token">GitHub Personal Access Token</label>
          <input type="password" id="setting-token" value="${currentToken}" placeholder="ghp_xxxxxxxxxxxx" autocomplete="off" />
          <p class="form-hint">Token 仅存储在浏览器 localStorage 中，需要 <code>repo</code> 权限。</p>
          <p class="form-hint"><a href="https://github.com/settings/tokens/new?scopes=repo&description=Blog+Writer" target="_blank" rel="noopener">👉 点此创建 Token</a></p>
        </div>
      `,
            [
                { id: 'settings-cancel', label: '取消', class: 'btn-secondary' },
                { id: 'settings-save', label: '保存', class: 'btn-primary' },
            ]
        );

        const input = modal.querySelector('#setting-token');
        input.focus();
        input.select();

        modal.querySelector('#settings-cancel').addEventListener('click', () => {
            closeModal(overlay);
            resolve(null);
        });

        modal.querySelector('#settings-save').addEventListener('click', () => {
            const token = input.value.trim();
            closeModal(overlay);
            resolve(token);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const token = input.value.trim();
                closeModal(overlay);
                resolve(token);
            }
        });
    });
}

/**
 * 新建文章弹窗
 */
export function showNewPostModal() {
    return new Promise((resolve) => {
        const today = new Date().toISOString().slice(0, 10);
        const { overlay, modal } = createModalBase(
            '📝 新建文章',
            `
        <div class="form-group">
          <label for="new-slug">文章 Slug（目录名）</label>
          <input type="text" id="new-slug" placeholder="my-new-post" autocomplete="off" />
          <p class="form-hint">将创建 <code>content/post/{slug}/index.md</code></p>
        </div>
        <div class="form-group">
          <label for="new-title">文章标题</label>
          <input type="text" id="new-title" placeholder="我的新文章" autocomplete="off" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="new-tags">标签（逗号分隔）</label>
            <input type="text" id="new-tags" placeholder="技术, 教程" autocomplete="off" />
          </div>
          <div class="form-group">
            <label for="new-categories">分类（逗号分隔）</label>
            <input type="text" id="new-categories" placeholder="技术" autocomplete="off" />
          </div>
        </div>
      `,
            [
                { id: 'new-cancel', label: '取消', class: 'btn-secondary' },
                { id: 'new-create', label: '创建', class: 'btn-primary' },
            ]
        );

        const slugInput = modal.querySelector('#new-slug');
        slugInput.focus();

        modal.querySelector('#new-cancel').addEventListener('click', () => {
            closeModal(overlay);
            resolve(null);
        });

        modal.querySelector('#new-create').addEventListener('click', () => {
            const slug = slugInput.value.trim();
            if (!slug) {
                slugInput.classList.add('shake');
                setTimeout(() => slugInput.classList.remove('shake'), 500);
                return;
            }
            const result = {
                slug,
                title: modal.querySelector('#new-title').value.trim() || slug,
                tags: modal.querySelector('#new-tags').value.split(',').map(s => s.trim()).filter(Boolean),
                categories: modal.querySelector('#new-categories').value.split(',').map(s => s.trim()).filter(Boolean),
            };
            closeModal(overlay);
            resolve(result);
        });
    });
}

/**
 * 确认删除弹窗
 */
export function showConfirmModal(title, message) {
    return new Promise((resolve) => {
        const { overlay, modal } = createModalBase(
            title,
            `<p class="confirm-message">${message}</p>`,
            [
                { id: 'confirm-cancel', label: '取消', class: 'btn-secondary' },
                { id: 'confirm-ok', label: '确认删除', class: 'btn-danger' },
            ]
        );

        modal.querySelector('#confirm-cancel').addEventListener('click', () => {
            closeModal(overlay);
            resolve(false);
        });

        modal.querySelector('#confirm-ok').addEventListener('click', () => {
            closeModal(overlay);
            resolve(true);
        });
    });
}

/**
 * 文字抹黑（Spoiler）使用教程
 */
export function showSpoilerGuideModal() {
    return new Promise((resolve) => {
        const sample = '这是一段普通的文字，但这里有 <span class="spoiler">一个隐藏的秘密</span>。';
        const { overlay, modal } = createModalBase(
            '文字抹黑使用教程',
            `
        <div class="guide-card">
          <p class="guide-text">在正文中直接写 HTML：</p>
          <pre class="guide-code"><code>${sample.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          <p class="form-hint">预览中将默认黑底黑字，鼠标悬停后显示内容。</p>
          <p class="form-hint">建议用于：剧透、答案、隐藏提示、敏感词弱曝光。</p>
        </div>
      `,
            [
                { id: 'spoiler-close', label: '关闭', class: 'btn-secondary' },
                { id: 'spoiler-insert', label: '插入示例', class: 'btn-primary' },
            ]
        );

        modal.querySelector('#spoiler-close').addEventListener('click', () => {
            closeModal(overlay);
            resolve(false);
        });

        modal.querySelector('#spoiler-insert').addEventListener('click', () => {
            closeModal(overlay);
            resolve(true);
        });
    });
}

export function showPrivateUnlockModal(meta, errorMessage = '') {
    return new Promise((resolve) => {
        const hint = meta.passwordHint ? `<p class="form-hint">密码提示：${meta.passwordHint}</p>` : '';
        const message = meta.privateMessage
            ? `<p class="form-hint">${meta.privateMessage}</p>`
            : '<p class="form-hint">这是一篇私密文章，输入密码后才能把正文解锁到编辑器里。</p>';
        const errorBlock = errorMessage ? `<p class="form-error">${errorMessage}</p>` : '';

        const { overlay, modal } = createModalBase(
            '🔐 解锁私密文章',
            `
        <div class="form-group">
          <label for="private-password">文章密码</label>
          <input type="password" id="private-password" placeholder="输入用于解锁正文的密码" autocomplete="off" />
          ${message}
          ${hint}
          ${errorBlock}
        </div>
      `,
            [
                { id: 'private-cancel', label: '稍后再说', class: 'btn-secondary' },
                { id: 'private-unlock', label: '解锁正文', class: 'btn-primary' },
            ]
        );

        const input = modal.querySelector('#private-password');
        input.focus();

        modal.querySelector('#private-cancel').addEventListener('click', () => {
            closeModal(overlay);
            resolve(null);
        });

        const submit = () => {
            const password = input.value.trim();
            if (!password) {
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 500);
                return;
            }
            closeModal(overlay);
            resolve(password);
        };

        modal.querySelector('#private-unlock').addEventListener('click', submit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });
    });
}
