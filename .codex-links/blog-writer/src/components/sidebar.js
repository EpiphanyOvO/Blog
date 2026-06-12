/**
 * 侧边栏组件 — 文章列表 & 搜索
 */

export function createSidebar(container, { onSelectPost, onNewPost, onRefresh }) {
    let posts = [];
    let searchQuery = '';
    let selectedSlug = null;

    const el = document.createElement('aside');
    el.className = 'sidebar';
    el.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <span class="sidebar-logo">✍️</span>
        <h1>Blog Writer</h1>
      </div>
      <button class="btn-icon sidebar-refresh-btn" id="sidebar-refresh" title="刷新列表">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      </button>
    </div>
    <div class="sidebar-search">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="sidebar-search" placeholder="搜索文章..." autocomplete="off" />
    </div>
    <div class="sidebar-actions">
      <button class="btn btn-primary btn-new-post" id="sidebar-new-post">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        新建文章
      </button>
    </div>
    <div class="sidebar-list" id="sidebar-list">
      <div class="sidebar-loading">加载中...</div>
    </div>
    <div class="sidebar-footer">
      <button class="btn-icon" id="sidebar-settings" title="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <span class="sidebar-footer-text">GitHub Pages Blog</span>
    </div>
  `;
    container.appendChild(el);

    // 事件绑定
    el.querySelector('#sidebar-search').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderList();
    });

    el.querySelector('#sidebar-new-post').addEventListener('click', () => onNewPost());
    el.querySelector('#sidebar-refresh').addEventListener('click', () => onRefresh());
    el.querySelector('#sidebar-settings').addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('open-settings'));
    });

    function renderList() {
        const listEl = el.querySelector('#sidebar-list');
        const filtered = posts.filter(p => p.name.toLowerCase().includes(searchQuery));

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="sidebar-empty">${searchQuery ? '没有找到匹配的文章' : '暂无文章'}</div>`;
            return;
        }

        listEl.innerHTML = filtered.map((post, i) => `
      <div class="sidebar-item ${post.name === selectedSlug ? 'active' : ''}" 
           data-slug="${post.name}" 
           style="animation-delay: ${i * 30}ms">
        <div class="sidebar-item-icon">📝</div>
        <div class="sidebar-item-info">
          <div class="sidebar-item-name">${post.name}</div>
        </div>
      </div>
    `).join('');

        listEl.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                selectedSlug = item.dataset.slug;
                onSelectPost(selectedSlug);
                renderList();
            });
        });
    }

    return {
        setPosts(newPosts) {
            posts = newPosts;
            renderList();
        },
        setSelected(slug) {
            selectedSlug = slug;
            renderList();
        },
        showLoading() {
            el.querySelector('#sidebar-list').innerHTML = `<div class="sidebar-loading"><div class="spinner"></div>加载中...</div>`;
        },
        showError(msg) {
            el.querySelector('#sidebar-list').innerHTML = `<div class="sidebar-error">${msg}</div>`;
        },
    };
}
