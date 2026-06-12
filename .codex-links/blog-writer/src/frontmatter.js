/**
 * YAML Front Matter 解析 & 序列化
 * 支持 Hugo hugo-theme-stack 的 front matter 格式
 */

/**
 * 解析 Markdown 文件，分离 front matter 和正文
 * @param {string} markdown - 完整的 Markdown 字符串
 * @returns {{ meta: Object, body: string }}
 */
export function parseFrontMatter(markdown) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
        return {
            meta: createDefaultMeta(),
            body: markdown,
        };
    }

    const yamlStr = match[1];
    const body = match[2];
    const meta = parseSimpleYaml(yamlStr);

    return { meta, body };
}

/**
 * 将 meta 对象和 body 合并为完整的 Markdown 字符串
 * @param {Object} meta
 * @param {string} body
 * @returns {string}
 */
export function serializeFrontMatter(meta, body, options = {}) {
    const includeEncryptedPayload = options.includeEncryptedPayload === true;
    const yamlLines = [];

    if (meta.title) yamlLines.push(`title: ${formatYamlScalar(meta.title)}`);
    if (meta.description) yamlLines.push(`description: ${formatYamlScalar(meta.description)}`);
    if (meta.date) yamlLines.push(`date: ${formatYamlScalar(meta.date)}`);
    if (meta.image) yamlLines.push(`image: ${formatYamlScalar(meta.image)}`);
    if (meta.tags && meta.tags.length > 0) {
        yamlLines.push('tags:');
        meta.tags.forEach(tag => yamlLines.push(`     - ${formatYamlScalar(tag)}`));
    }
    if (meta.categories && meta.categories.length > 0) {
        yamlLines.push('categories:');
        meta.categories.forEach(cat => yamlLines.push(`     - ${formatYamlScalar(cat)}`));
    }
    if (meta.private) {
        yamlLines.push('private: true');
        if (meta.passwordHint) yamlLines.push(`passwordHint: ${formatYamlScalar(meta.passwordHint)}`);
        if (meta.privateMessage) yamlLines.push(`privateMessage: ${formatYamlScalar(meta.privateMessage)}`);
        if (includeEncryptedPayload) {
            yamlLines.push(`privateFormat: ${formatYamlScalar(meta.privateFormat || 'markdown')}`);
            yamlLines.push(`privateIterations: ${Number(meta.privateIterations) || 310000}`);
            if (meta.privateSalt) yamlLines.push(`privateSalt: ${formatYamlScalar(meta.privateSalt)}`);
            if (meta.privateIv) yamlLines.push(`privateIv: ${formatYamlScalar(meta.privateIv)}`);
            if (meta.privateCiphertext) yamlLines.push(`privateCiphertext: ${formatYamlScalar(meta.privateCiphertext)}`);
        }
    }

    // 保留额外的字段
    if (meta._extra) {
        for (const [key, value] of Object.entries(meta._extra)) {
            yamlLines.push(`${key}: ${value}`);
        }
    }

    return `---\n${yamlLines.join('\n')}\n---\n\n${body}`;
}

/**
 * 简单的 YAML 解析器（仅支持博客 front matter 用到的子集）
 */
function parseSimpleYaml(yamlStr) {
    const meta = {
        ...createDefaultMeta(),
    };

    const lines = yamlStr.split(/\r?\n/);
    let currentArrayKey = null;

    for (const line of lines) {
        // 数组项
        const arrayItemMatch = line.match(/^\s+-\s+(.*)$/);
        if (arrayItemMatch && currentArrayKey) {
            if (meta[currentArrayKey] && Array.isArray(meta[currentArrayKey])) {
                meta[currentArrayKey].push(String(parseYamlScalar(arrayItemMatch[1].trim())));
            }
            continue;
        }

        // 键值对
        const kvMatch = line.match(/^(\w+):\s*(.*)$/);
        if (kvMatch) {
            const key = kvMatch[1];
            const value = parseYamlScalar(kvMatch[2].trim());

            if (key === 'title') {
                meta.title = value;
                currentArrayKey = null;
            } else if (key === 'description') {
                meta.description = value;
                currentArrayKey = null;
            } else if (key === 'date') {
                meta.date = value;
                currentArrayKey = null;
            } else if (key === 'image') {
                meta.image = value;
                currentArrayKey = null;
            } else if (key === 'private') {
                meta.private = value === true || value === 'true';
                currentArrayKey = null;
            } else if (key === 'passwordHint') {
                meta.passwordHint = String(value ?? '');
                currentArrayKey = null;
            } else if (key === 'privateMessage') {
                meta.privateMessage = String(value ?? '');
                currentArrayKey = null;
            } else if (key === 'privateFormat') {
                meta.privateFormat = String(value || 'markdown');
                currentArrayKey = null;
            } else if (key === 'privateIterations') {
                meta.privateIterations = Number(value) || 310000;
                currentArrayKey = null;
            } else if (key === 'privateSalt') {
                meta.privateSalt = String(value ?? '');
                currentArrayKey = null;
            } else if (key === 'privateIv') {
                meta.privateIv = String(value ?? '');
                currentArrayKey = null;
            } else if (key === 'privateCiphertext') {
                meta.privateCiphertext = String(value ?? '');
                currentArrayKey = null;
            } else if (key === 'tags') {
                if (value) {
                    meta.tags = String(value).replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
                    currentArrayKey = null;
                } else {
                    currentArrayKey = 'tags';
                }
            } else if (key === 'categories') {
                if (value) {
                    meta.categories = String(value).replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
                    currentArrayKey = null;
                } else {
                    currentArrayKey = 'categories';
                }
            } else {
                meta._extra[key] = value;
                currentArrayKey = null;
            }
        }
    }

    return meta;
}

/**
 * 创建新文章默认 front matter
 */
export function createDefaultMeta(title = '') {
    return {
        title,
        description: '',
        date: new Date().toISOString().slice(0, 10),
        image: '',
        tags: [],
        categories: [],
        private: false,
        passwordHint: '',
        privateMessage: '',
        privateFormat: 'markdown',
        privateIterations: 310000,
        privateSalt: '',
        privateIv: '',
        privateCiphertext: '',
        _extra: {},
    };
}

function formatYamlScalar(value) {
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value === null || value === undefined || value === '') return '""';
    return JSON.stringify(String(value));
}

function parseYamlScalar(value) {
    if (value === '') return '';
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^-?\d+$/.test(value)) return Number(value);

    const quoted = value.match(/^"(.*)"$/) || value.match(/^'(.*)'$/);
    if (quoted) {
        try {
            return JSON.parse(`"${quoted[1].replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
        } catch {
            return quoted[1];
        }
    }

    return value;
}
