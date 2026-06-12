/**
 * 主应用逻辑 — 状态管理 & UI 渲染
 */
import { listPosts, getPost, savePost, deletePost, uploadImage, getToken, validateToken } from './github.js';
import { createEditor, setContent, getContent, insertAtCursor } from './editor.js';
import { initPreview, updatePreview } from './preview.js';
import { parseFrontMatter, serializeFrontMatter, createDefaultMeta } from './frontmatter.js';
import { encryptPrivateBody, decryptPrivateBody } from './crypto.js';
import { createSidebar } from './components/sidebar.js';
import { createToolbar } from './components/toolbar.js';
import { showSettingsModal, showNewPostModal, showConfirmModal, showSpoilerGuideModal, showPrivateUnlockModal } from './components/modal.js';

// 应用状态
const state = {
    posts: [],
    currentSlug: null,
    currentSha: null,
    currentMeta: null,
    previewVisible: true,
    isDirty: false,
    currentPrivateUnlocked: false,
    currentPrivatePassword: '',
};

let sidebar = null;
let toolbar = null;

/**
 * 初始化 App
 */
export async function initApp() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = '';
    appEl.className = 'app-layout';

    // 移动端遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    overlay.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
    appEl.appendChild(overlay);

    // 侧边栏
    sidebar = createSidebar(appEl, {
        onSelectPost: loadPost,
        onNewPost: handleNewPost,
        onRefresh: refreshPosts,
    });

    // 主区域容器
    const main = document.createElement('main');
    main.className = 'main-area';

    // 工具栏
    toolbar = createToolbar(main, {
        onSave: handleSave,
        onDelete: handleDelete,
        onTogglePreview: togglePreview,
        onUploadImage: handleUploadImage,
        onMenu: () => document.body.classList.toggle('sidebar-open'),
        onSpoilerGuide: handleSpoilerGuide,
        onUnlockPrivate: handleUnlockPrivate,
    });

    // Front Matter 面板
    const fmPanel = document.createElement('div');
    fmPanel.className = 'frontmatter-panel';
    fmPanel.id = 'frontmatter-panel';
    fmPanel.innerHTML = `
    <div class="fm-toggle" id="fm-toggle">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      <span>Front Matter</span>
    </div>
    <div class="fm-fields" id="fm-fields">
      <div class="fm-row">
        <div class="fm-field fm-field-wide">
          <label>标题</label>
          <input type="text" id="fm-title" placeholder="文章标题" />
        </div>
        <div class="fm-field fm-field-wide">
          <label>Description</label>
          <input type="text" id="fm-description" placeholder="文章摘要 / 描述" />
        </div>
        <div class="fm-field">
          <label>日期</label>
          <input type="date" id="fm-date" />
        </div>
      </div>
      <div class="fm-row">
        <div class="fm-field">
          <label>标签</label>
          <input type="text" id="fm-tags" placeholder="用逗号分隔" />
        </div>
        <div class="fm-field">
          <label>分类</label>
          <input type="text" id="fm-categories" placeholder="用逗号分隔" />
        </div>
        <div class="fm-field">
          <label>封面图</label>
          <div class="fm-image-row">
            <input type="text" id="fm-image" placeholder="图片文件名 (如 cover.jpg)" />
            <button type="button" class="btn btn-tool fm-upload-btn" id="fm-image-upload">上传封面</button>
          </div>
          <input type="file" id="fm-image-file" accept="image/*" style="display: none;" />
        </div>
      </div>
      <div class="fm-row fm-row-private">
        <div class="fm-field fm-field-checkbox">
          <label class="fm-checkbox">
            <input type="checkbox" id="fm-private" />
            <span>启用私密文章</span>
          </label>
        </div>
        <div class="fm-field">
          <label>加密密码</label>
          <input type="password" id="fm-private-password" placeholder="仅本地使用，不会写入仓库" autocomplete="new-password" />
        </div>
        <div class="fm-field">
          <label>确认密码</label>
          <input type="password" id="fm-private-password-confirm" placeholder="再次输入加密密码" autocomplete="new-password" />
        </div>
      </div>
      <div class="fm-row fm-row-private-extra">
        <div class="fm-field">
          <label>密码提示</label>
          <input type="text" id="fm-password-hint" placeholder="可选，给读者的提示" />
        </div>
        <div class="fm-field fm-field-wide">
          <label>解锁提示文案</label>
          <input type="text" id="fm-private-message" placeholder="可选，显示在文章密码输入框上方" />
        </div>
      </div>
    </div>
  `;
    main.appendChild(fmPanel);

    // Front Matter 折叠
    fmPanel.querySelector('#fm-toggle').addEventListener('click', () => {
        fmPanel.classList.toggle('collapsed');
    });

    // Front Matter 字段变更 → 同步到编辑器
    ['fm-title', 'fm-description', 'fm-date', 'fm-tags', 'fm-categories', 'fm-image', 'fm-password-hint', 'fm-private-message'].forEach(id => {
        fmPanel.querySelector(`#${id}`).addEventListener('input', () => {
            syncFrontMatterToEditor();
        });
    });
    fmPanel.querySelector('#fm-private').addEventListener('change', () => {
        togglePrivateFields();
        syncFrontMatterToEditor();
    });

    // 封面图上传
    const coverUploadBtn = fmPanel.querySelector('#fm-image-upload');
    const coverUploadInput = fmPanel.querySelector('#fm-image-file');
    coverUploadBtn.addEventListener('click', () => coverUploadInput.click());
    coverUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) await handleCoverUpload(file);
        coverUploadInput.value = '';
    });

    // 编辑/预览区域
    const workspace = document.createElement('div');
    workspace.className = 'workspace';

    const editorPane = document.createElement('div');
    editorPane.className = 'editor-pane';
    editorPane.id = 'editor-pane';

    const previewPane = document.createElement('div');
    previewPane.className = 'preview-pane';
    previewPane.id = 'preview-pane';
    previewPane.innerHTML = `
    <div class="preview-header">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      <span>预览</span>
    </div>
    <div class="preview-content" id="preview-content"></div>
  `;

    workspace.appendChild(editorPane);
    workspace.appendChild(previewPane);
    main.appendChild(workspace);

    // 欢迎占位
    const welcomeEl = document.createElement('div');
    welcomeEl.className = 'welcome-placeholder';
    welcomeEl.id = 'welcome-placeholder';
    welcomeEl.innerHTML = `
    <div class="welcome-icon">✍️</div>
    <h2>欢迎使用 Blog Writer</h2>
    <p>从左侧选择一篇文章开始编辑，或创建新文章</p>
    <div class="welcome-shortcuts">
      <div class="shortcut-item"><kbd>Ctrl</kbd>+<kbd>S</kbd> 保存</div>
      <div class="shortcut-item"><kbd>Ctrl</kbd>+<kbd>N</kbd> 新建</div>
    </div>
  `;
    main.appendChild(welcomeEl);

    appEl.appendChild(main);

    // 初始化编辑器
    createEditor(editorPane, '', (content) => {
        state.isDirty = true;
        updatePreview(content);
        // 从编辑器内容解析 front matter 同步到面板
        syncEditorToFrontMatter(content);
    });

    // 初始化预览
    initPreview(document.getElementById('preview-content'));

    // 默认隐藏编辑区域，显示欢迎
    workspace.style.display = 'none';
    fmPanel.style.display = 'none';

    // 全局快捷键
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            handleNewPost();
        }
    });

    // 设置事件
    document.addEventListener('open-settings', async () => {
        const token = await showSettingsModal(getToken());
        if (token !== null) {
            localStorage.setItem('github_token', token);
            toolbar.setStatus('Token 已保存', 'success');
            refreshPosts();
        }
    });

    // 检查 Token
    if (!getToken()) {
        const token = await showSettingsModal('');
        if (token) {
            localStorage.setItem('github_token', token);
        }
    }

    // 加载文章
    await refreshPosts();
}

/**
 * 刷新文章列表
 */
async function refreshPosts() {
    sidebar.showLoading();
    try {
        state.posts = await listPosts();
        sidebar.setPosts(state.posts);
    } catch (err) {
        sidebar.showError('加载失败，请检查 Token');
        console.error(err);
    }
}

/**
 * 加载一篇文章
 */
async function loadPost(slug) {
    toolbar.setStatus('加载中...', 'info');
    const workspace = document.querySelector('.workspace');
    const fmPanel = document.getElementById('frontmatter-panel');
    const welcome = document.getElementById('welcome-placeholder');

    try {
        const { content, sha } = await getPost(slug);
        state.currentSlug = slug;
        state.currentSha = sha;
        state.isDirty = false;

        // 解析 front matter
        const { meta, body } = parseFrontMatter(content);
        state.currentMeta = meta;
        state.currentPrivateUnlocked = false;
        state.currentPrivatePassword = '';

        const editableBody = await resolveEditableBody(meta, body);
        const editableContent = buildEditableDocument(meta, editableBody);
        setContent(editableContent);
        updatePreview(editableContent);

        // 同步 front matter 面板
        updateFrontMatterPanel(meta);

        // 显示编辑区域
        workspace.style.display = '';
        fmPanel.style.display = '';
        welcome.style.display = 'none';
        document.body.classList.remove('sidebar-open');

        toolbar.setSlug(slug);
        toolbar.setPrivateUnlockEnabled(Boolean(meta.private && meta.privateCiphertext && !state.currentPrivateUnlocked));
        toolbar.setStatus('已加载', 'success');
        sidebar.setSelected(slug);
    } catch (err) {
        toolbar.setStatus(`加载失败: ${err.message}`, 'error');
        console.error(err);
    }
}

/**
 * 保存文章
 */
async function handleSave() {
    if (!state.currentSlug) return;

    toolbar.setStatus('保存中...', 'info');
    try {
        const editorContent = getContent();
        let { meta, body } = parseFrontMatter(editorContent);
        meta = {
            ...state.currentMeta,
            ...meta,
            _extra: state.currentMeta?._extra || {},
        };

        let content = '';
        if (meta.private) {
            if (!state.currentPrivateUnlocked && meta.privateCiphertext) {
                throw new Error('请先解锁私密正文，再保存。');
            }

            const passwordInput = document.getElementById('fm-private-password');
            const passwordConfirmInput = document.getElementById('fm-private-password-confirm');
            const password = passwordInput.value.trim() || state.currentPrivatePassword;
            const passwordConfirm = passwordConfirmInput.value.trim() || state.currentPrivatePassword;
            if (!password || !passwordConfirm) {
                throw new Error('私密文章保存前必须输入加密密码。');
            }
            if (password !== passwordConfirm) {
                throw new Error('两次输入的加密密码不一致。');
            }
            passwordInput.value = password;
            passwordConfirmInput.value = passwordConfirm;

            const encrypted = await encryptPrivateBody(body, password, {
                iterations: Number(meta.privateIterations) || 310000,
                format: 'markdown',
            });

            meta = {
                ...meta,
                ...encrypted,
            };
            state.currentMeta = meta;
            state.currentPrivatePassword = password;
            state.currentPrivateUnlocked = true;
            content = serializeFrontMatter(meta, '', { includeEncryptedPayload: true });
        } else {
            meta = clearPrivatePayload(meta);
            state.currentMeta = meta;
            state.currentPrivatePassword = '';
            state.currentPrivateUnlocked = false;
            content = serializeFrontMatter(meta, body);
        }

        const result = await savePost(state.currentSlug, content, state.currentSha);
        state.currentSha = result.content.sha;
        state.isDirty = false;
        toolbar.setPrivateUnlockEnabled(Boolean(meta.private && meta.privateCiphertext && !state.currentPrivateUnlocked));
        toolbar.setStatus('保存成功 ✓', 'success');
    } catch (err) {
        toolbar.setStatus(`保存失败: ${err.message}`, 'error');
        console.error(err);
    }
}

/**
 * 删除文章
 */
async function handleDelete() {
    if (!state.currentSlug) return;

    const confirmed = await showConfirmModal(
        '⚠️ 确认删除',
        `确定要删除文章 <strong>${state.currentSlug}</strong> 吗？此操作不可撤销。`
    );

    if (!confirmed) return;

    toolbar.setStatus('删除中...', 'info');
    try {
        await deletePost(state.currentSlug);
        state.currentSlug = null;
        state.currentSha = null;

        // 隐藏编辑区域
        document.querySelector('.workspace').style.display = 'none';
        document.getElementById('frontmatter-panel').style.display = 'none';
        document.getElementById('welcome-placeholder').style.display = '';

        toolbar.setSlug(null);
        toolbar.setStatus('已删除', 'success');
        await refreshPosts();
    } catch (err) {
        toolbar.setStatus(`删除失败: ${err.message}`, 'error');
        console.error(err);
    }
}

/**
 * 新建文章
 */
async function handleNewPost() {
    const result = await showNewPostModal();
    if (!result) return;

    toolbar.setStatus('创建中...', 'info');
    try {
        const meta = createDefaultMeta(result.title);
        meta.tags = result.tags;
        meta.categories = result.categories;

        const content = serializeFrontMatter(meta, '\n开始写作吧！\n');
        await savePost(result.slug, content, null);

        await refreshPosts();
        await loadPost(result.slug);
        document.getElementById('fm-private-password').value = '';
        toolbar.setStatus('创建成功 ✓', 'success');
    } catch (err) {
        toolbar.setStatus(`创建失败: ${err.message}`, 'error');
        console.error(err);
    }
}

/**
 * 上传图片
 */
async function handleUploadImage(file) {
    if (!state.currentSlug) return;

    toolbar.setStatus('插图上传中...', 'info');
    try {
        const base64 = await fileToBase64(file);
        await uploadImage(state.currentSlug, file.name, base64);
        // 插入 Markdown 图片引用
        insertAtCursor(`\n![${file.name}](${file.name})\n`);
        toolbar.setStatus('插图上传成功 ✓', 'success');
    } catch (err) {
        toolbar.setStatus(`上传失败: ${err.message}`, 'error');
        console.error(err);
    }
}

/**
 * 上传封面图（并写入 front matter image 字段）
 */
async function handleCoverUpload(file) {
    if (!state.currentSlug) return;

    toolbar.setStatus('封面上传中...', 'info');
    try {
        const base64 = await fileToBase64(file);
        await uploadImage(state.currentSlug, file.name, base64);
        document.getElementById('fm-image').value = file.name;
        syncFrontMatterToEditor();
        toolbar.setStatus('封面上传成功 ✓', 'success');
    } catch (err) {
        toolbar.setStatus(`封面上传失败: ${err.message}`, 'error');
        console.error(err);
    }
}

/**
 * 抹黑文字教程与示例插入
 */
async function handleSpoilerGuide() {
    const shouldInsert = await showSpoilerGuideModal();
    if (!shouldInsert) return;

    const snippet = '这是一段普通的文字，但这里有 <span class="spoiler">一个隐藏的秘密</span>。';
    insertAtCursor(`\n${snippet}\n`);
    state.isDirty = true;
    updatePreview(getContent());
    toolbar.setStatus('已插入抹黑示例', 'success');
}

/**
 * 切换预览面板
 */
function togglePreview() {
    state.previewVisible = !state.previewVisible;
    const previewPane = document.getElementById('preview-pane');
    previewPane.style.display = state.previewVisible ? '' : 'none';

    const editorPane = document.getElementById('editor-pane');
    editorPane.style.flex = state.previewVisible ? '' : '1';
}

/**
 * 更新 Front Matter 面板
 */
function updateFrontMatterPanel(meta) {
    document.getElementById('fm-title').value = meta.title || '';
    document.getElementById('fm-description').value = meta.description || '';
    document.getElementById('fm-date').value = meta.date || '';
    document.getElementById('fm-tags').value = (meta.tags || []).join(', ');
    document.getElementById('fm-categories').value = (meta.categories || []).join(', ');
    document.getElementById('fm-image').value = meta.image || '';
    document.getElementById('fm-private').checked = Boolean(meta.private);
    document.getElementById('fm-private-password').value = state.currentPrivatePassword || '';
    document.getElementById('fm-private-password-confirm').value = state.currentPrivatePassword || '';
    document.getElementById('fm-password-hint').value = meta.passwordHint || '';
    document.getElementById('fm-private-message').value = meta.privateMessage || '';
    togglePrivateFields();
}

/**
 * 从面板同步到编辑器
 */
function syncFrontMatterToEditor() {
    const meta = {
        title: document.getElementById('fm-title').value,
        description: document.getElementById('fm-description').value,
        date: document.getElementById('fm-date').value,
        image: document.getElementById('fm-image').value,
        tags: document.getElementById('fm-tags').value.split(',').map(s => s.trim()).filter(Boolean),
        categories: document.getElementById('fm-categories').value.split(',').map(s => s.trim()).filter(Boolean),
        private: document.getElementById('fm-private').checked,
        passwordHint: document.getElementById('fm-password-hint').value.trim(),
        privateMessage: document.getElementById('fm-private-message').value.trim(),
        privateFormat: 'markdown',
        privateIterations: state.currentMeta?.privateIterations || 310000,
        privateSalt: state.currentMeta?.privateSalt || '',
        privateIv: state.currentMeta?.privateIv || '',
        privateCiphertext: state.currentMeta?.privateCiphertext || '',
        _extra: state.currentMeta?._extra || {},
    };
    state.currentMeta = meta;

    const currentContent = getContent();
    const { body } = parseFrontMatter(currentContent);
    const newContent = buildEditableDocument(meta, body);
    setContent(newContent);
    updatePreview(newContent);
    toolbar.setPrivateUnlockEnabled(Boolean(meta.private && meta.privateCiphertext && !state.currentPrivateUnlocked));
    state.isDirty = true;
}

/**
 * 从编辑器同步到面板（不触发循环）
 */
let syncLock = false;
function syncEditorToFrontMatter(content) {
    if (syncLock) return;
    syncLock = true;
    try {
        const { meta } = parseFrontMatter(content);
        state.currentMeta = {
            ...state.currentMeta,
            ...meta,
        };
        updateFrontMatterPanel(meta);
    } finally {
        syncLock = false;
    }
}

function buildEditableDocument(meta, body) {
    return serializeFrontMatter(meta, body);
}

function clearPrivatePayload(meta) {
    return {
        ...meta,
        private: false,
        passwordHint: '',
        privateMessage: '',
        privateFormat: 'markdown',
        privateIterations: 310000,
        privateSalt: '',
        privateIv: '',
        privateCiphertext: '',
    };
}

function togglePrivateFields() {
    const enabled = document.getElementById('fm-private').checked;
    document.getElementById('frontmatter-panel').classList.toggle('private-enabled', enabled);
}

async function resolveEditableBody(meta, body) {
    if (!meta.private) {
        state.currentPrivateUnlocked = false;
        state.currentPrivatePassword = '';
        return body;
    }

    if (!meta.privateCiphertext) {
        state.currentPrivateUnlocked = body.trim().length > 0;
        return body;
    }

    if (body.trim()) {
        state.currentPrivateUnlocked = true;
        return body;
    }

    return promptPrivateUnlock(meta);
}

async function promptPrivateUnlock(meta) {
    let errorMessage = '';

    while (true) {
        const password = await showPrivateUnlockModal(meta, errorMessage);
        if (password === null) {
            state.currentPrivateUnlocked = false;
            state.currentPrivatePassword = '';
            document.getElementById('fm-private-password').value = '';
            document.getElementById('fm-private-password-confirm').value = '';
            return '';
        }

        try {
            const plaintext = await decryptPrivateBody(meta, password);
            state.currentPrivateUnlocked = true;
            state.currentPrivatePassword = password;
            document.getElementById('fm-private-password').value = password;
            document.getElementById('fm-private-password-confirm').value = password;
            toolbar.setPrivateUnlockEnabled(false);
            return plaintext;
        } catch (err) {
            errorMessage = err.message;
        }
    }
}

async function handleUnlockPrivate() {
    if (!state.currentSlug || !state.currentMeta?.private || !state.currentMeta?.privateCiphertext) {
        return;
    }

    try {
        const plaintext = await promptPrivateUnlock(state.currentMeta);
        if (!state.currentPrivateUnlocked) {
            toolbar.setStatus('私密正文仍处于锁定状态', 'info');
            return;
        }
        const editableContent = buildEditableDocument(state.currentMeta, plaintext);
        setContent(editableContent);
        updatePreview(editableContent);
        toolbar.setStatus('私密正文已解锁', 'success');
    } catch (err) {
        toolbar.setStatus(`解锁失败: ${err.message}`, 'error');
    }
}

/**
 * File → Base64（不含 data: 前缀）
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

