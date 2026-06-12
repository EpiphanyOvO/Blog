/**
 * GitHub API 封装
 * 通过 GitHub REST API 直接操作博客仓库
 */

const OWNER = 'EpiphanyOvO';
const REPO = 'Blog';
const BRANCH = 'master';
const API_BASE = 'https://api.github.com';
const CONTENT_PATH = 'content/post';

function getToken() {
  return localStorage.getItem('github_token') || '';
}

function headers() {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

async function apiRequest(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers(), ...options.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  // DELETE returns 204 no content
  if (res.status === 204) return null;
  return res.json();
}

/**
 * 获取所有文章列表
 */
export async function listPosts() {
  const data = await apiRequest(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${CONTENT_PATH}?ref=${BRANCH}`);
  return data.filter(item => item.type === 'dir').map(item => ({
    name: item.name,
    path: item.path,
  }));
}

/**
 * 获取文章目录下所有文件
 */
export async function getPostFiles(slug) {
  return apiRequest(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${CONTENT_PATH}/${slug}?ref=${BRANCH}`);
}

/**
 * 获取文章 index.md 内容
 */
export async function getPost(slug) {
  const data = await apiRequest(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${CONTENT_PATH}/${slug}/index.md?ref=${BRANCH}`
  );
  return {
    content: decodeBase64(data.content),
    sha: data.sha,
    path: data.path,
  };
}

/**
 * 保存（创建或更新）文章
 */
export async function savePost(slug, content, sha = null) {
  const path = `${CONTENT_PATH}/${slug}/index.md`;
  const body = {
    message: sha ? `update: ${slug}` : `new post: ${slug}`,
    content: encodeBase64(content),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  return apiRequest(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * 上传图片到文章目录
 */
export async function uploadImage(slug, filename, base64Data) {
  const path = `${CONTENT_PATH}/${slug}/${filename}`;

  // 尝试获取已有文件的 sha（更新时需要）
  let sha = null;
  try {
    const existing = await apiRequest(
      `${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`
    );
    sha = existing.sha;
  } catch (e) {
    // 文件不存在，正常创建
  }

  const body = {
    message: `upload image: ${filename} for ${slug}`,
    content: base64Data,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  return apiRequest(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * 删除文章（删除目录下所有文件）
 */
export async function deletePost(slug) {
  const files = await getPostFiles(slug);
  for (const file of files) {
    await apiRequest(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${file.path}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `delete: ${slug}/${file.name}`,
        sha: file.sha,
        branch: BRANCH,
      }),
    });
  }
}

/**
 * 验证 Token 是否有效
 */
export async function validateToken() {
  const data = await apiRequest(`${API_BASE}/repos/${OWNER}/${REPO}`);
  return {
    valid: true,
    permissions: data.permissions,
    fullName: data.full_name,
  };
}

// Base64 编解码（支持 UTF-8）
function encodeBase64(str) {
  return btoa(
    new Uint8Array(new TextEncoder().encode(str)).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );
}

function decodeBase64(base64) {
  const binaryStr = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export { getToken };
