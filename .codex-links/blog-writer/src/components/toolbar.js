/**
 * 工具栏组件
 */
export function createToolbar(container, { onSave, onDelete, onTogglePreview, onUploadImage, onMenu, onSpoilerGuide, onUnlockPrivate }) {
  const el = document.createElement('div');
  el.className = 'toolbar';
  el.innerHTML = `
    <div class="toolbar-left">
      <button class="btn-menu" id="toolbar-menu" title="Menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div class="toolbar-slug" id="toolbar-slug">
        <span class="toolbar-slug-label">未选择文章</span>
      </div>
      <div class="toolbar-status" id="toolbar-status"></div>
    </div>
    <div class="toolbar-right">
      <button class="btn btn-tool" id="toolbar-upload" title="上传插图" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <span>插图</span>
      </button>
      <button class="btn btn-tool" id="toolbar-preview" title="切换预览">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <span>预览</span>
      </button>
      <button class="btn btn-tool" id="toolbar-spoiler-guide" title="文字抹黑教程">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>
        <span>抹黑教程</span>
      </button>
      <button class="btn btn-tool" id="toolbar-private-unlock" title="解锁私密正文" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>解锁正文</span>
      </button>
      <div class="toolbar-divider"></div>
      <button class="btn btn-tool btn-danger" id="toolbar-delete" title="删除文章" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        <span>删除</span>
      </button>
      <button class="btn btn-save" id="toolbar-save" title="保存文章" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span>保存</span>
      </button>
    </div>
  `;
  container.appendChild(el);

  // 隐藏的文件上传 input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  el.querySelector('#toolbar-save').addEventListener('click', onSave);
  if (onMenu) {
    el.querySelector('#toolbar-menu').addEventListener('click', onMenu);
  }
  el.querySelector('#toolbar-delete').addEventListener('click', onDelete);
  el.querySelector('#toolbar-preview').addEventListener('click', onTogglePreview);
  if (onSpoilerGuide) {
    el.querySelector('#toolbar-spoiler-guide').addEventListener('click', onSpoilerGuide);
  }
  if (onUnlockPrivate) {
    el.querySelector('#toolbar-private-unlock').addEventListener('click', onUnlockPrivate);
  }
  el.querySelector('#toolbar-upload').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) onUploadImage(file);
    fileInput.value = '';
  });

  return {
    setSlug(slug) {
      const slugEl = el.querySelector('.toolbar-slug-label');
      slugEl.textContent = slug || '未选择文章';
      el.querySelector('#toolbar-save').disabled = !slug;
      el.querySelector('#toolbar-delete').disabled = !slug;
      el.querySelector('#toolbar-upload').disabled = !slug;
    },
    setPrivateUnlockEnabled(enabled) {
      el.querySelector('#toolbar-private-unlock').disabled = !enabled;
    },
    setStatus(text, type = 'info') {
      const statusEl = el.querySelector('#toolbar-status');
      statusEl.textContent = text;
      statusEl.className = `toolbar-status status-${type}`;
      if (type === 'success') {
        statusEl.classList.add('pulse');
        setTimeout(() => statusEl.classList.remove('pulse'), 2000);
      }
      if (text) {
        setTimeout(() => {
          if (statusEl.textContent === text) statusEl.textContent = '';
        }, 4000);
      }
    },
  };
}
