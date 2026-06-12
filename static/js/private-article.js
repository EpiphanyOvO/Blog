(() => {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const normalizeBase64 = (value) => (value || "").replace(/\s+/g, "");

    const base64ToBytes = (value) => {
        const normalized = normalizeBase64(value);
        const binary = window.atob(normalized);
        return Uint8Array.from(binary, (char) => char.charCodeAt(0));
    };

    const escapeHtml = (value) => value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const renderInline = (value) => {
        const codeSpans = [];

        let output = value.replace(/`([^`]+)`/g, (_, code) => {
            const token = `@@CODE${codeSpans.length}@@`;
            codeSpans.push(`<code>${escapeHtml(code)}</code>`);
            return token;
        });

        output = output.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_, alt, src, title) => {
            const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
            return `<img src="${src}" alt="${escapeHtml(alt)}"${titleAttr}>`;
        });

        output = output.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_, text, href, title) => {
            const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
            return `<a href="${href}"${titleAttr}>${text}</a>`;
        });

        output = output
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/__(.+?)__/g, "<strong>$1</strong>")
            .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, "<em>$1</em>")
            .replace(/(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)/g, "<em>$1</em>")
            .replace(/~~(.+?)~~/g, "<del>$1</del>");

        codeSpans.forEach((html, index) => {
            output = output.replace(`@@CODE${index}@@`, html);
        });

        return output;
    };

    const renderMarkdown = (markdown) => {
        const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
        let index = 0;
        let html = "";

        const isSpecialBlock = (line) => {
            const trimmed = line.trim();
            return !trimmed
                || /^#{1,6}\s+/.test(trimmed)
                || /^```/.test(trimmed)
                || /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)
                || /^\s*>/.test(trimmed)
                || /^\s*[-*+]\s+/.test(trimmed)
                || /^\s*\d+\.\s+/.test(trimmed);
        };

        while (index < lines.length) {
            const line = lines[index];
            const trimmed = line.trim();

            if (!trimmed) {
                index += 1;
                continue;
            }

            const codeFenceMatch = trimmed.match(/^```([\w-]+)?\s*$/);
            if (codeFenceMatch) {
                const language = codeFenceMatch[1] || "";
                const codeLines = [];
                index += 1;

                while (index < lines.length && !/^```/.test(lines[index].trim())) {
                    codeLines.push(lines[index]);
                    index += 1;
                }

                if (index < lines.length) {
                    index += 1;
                }

                const className = language ? ` class="language-${language}"` : "";
                html += `<pre><code${className}>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
                continue;
            }

            const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                html += `<h${level}>${renderInline(headingMatch[2])}</h${level}>`;
                index += 1;
                continue;
            }

            if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                html += "<hr>";
                index += 1;
                continue;
            }

            if (/^\s*>/.test(line)) {
                const quoteLines = [];
                while (index < lines.length && (lines[index].trim() === "" || /^\s*>/.test(lines[index]))) {
                    quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
                    index += 1;
                }
                html += `<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`;
                continue;
            }

            if (/^\s*[-*+]\s+/.test(line)) {
                const items = [];
                while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
                    items.push(lines[index].replace(/^\s*[-*+]\s+/, ""));
                    index += 1;
                }
                html += `<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`;
                continue;
            }

            if (/^\s*\d+\.\s+/.test(line)) {
                const items = [];
                while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
                    items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
                    index += 1;
                }
                html += `<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`;
                continue;
            }

            if (/^<[^>]+>/.test(trimmed) && !/[.!?]\s*$/.test(trimmed)) {
                html += trimmed;
                index += 1;
                continue;
            }

            const paragraphLines = [line];
            index += 1;

            while (index < lines.length && !isSpecialBlock(lines[index])) {
                paragraphLines.push(lines[index]);
                index += 1;
            }

            html += `<p>${renderInline(paragraphLines.join("<br>"))}</p>`;
        }

        return html;
    };

    const deriveKeys = async (password, saltBytes, iterations) => {
        const material = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );

        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: saltBytes,
                iterations,
                hash: "SHA-256",
            },
            material,
            512
        );

        const keyBytes = new Uint8Array(derivedBits);
        const encryptionKeyBytes = keyBytes.slice(0, 32);
        const macKeyBytes = keyBytes.slice(32, 64);

        const encryptionKey = await window.crypto.subtle.importKey(
            "raw",
            encryptionKeyBytes,
            {
                name: "AES-CBC",
            },
            false,
            ["decrypt"]
        );

        const macKey = await window.crypto.subtle.importKey(
            "raw",
            macKeyBytes,
            {
                name: "HMAC",
                hash: "SHA-256",
            },
            false,
            ["verify"]
        );

        return { encryptionKey, macKey };
    };

    const decryptPayload = async (payload, password) => {
        const saltBytes = base64ToBytes(payload.salt);
        const ivBytes = base64ToBytes(payload.iv);
        const payloadBytes = base64ToBytes(payload.ciphertext);
        const { encryptionKey, macKey } = await deriveKeys(password, saltBytes, Number(payload.iterations) || 310000);

        if (payloadBytes.length <= 32) {
            throw new Error("Ciphertext payload is too short.");
        }

        const ciphertextBytes = payloadBytes.slice(0, payloadBytes.length - 32);
        const macBytes = payloadBytes.slice(payloadBytes.length - 32);
        const macInput = new Uint8Array(ivBytes.length + ciphertextBytes.length);
        macInput.set(ivBytes, 0);
        macInput.set(ciphertextBytes, ivBytes.length);

        const macIsValid = await window.crypto.subtle.verify(
            "HMAC",
            macKey,
            macBytes,
            macInput
        );

        if (!macIsValid) {
            throw new Error("HMAC verification failed.");
        }

        const plainBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: ivBytes,
            },
            encryptionKey,
            ciphertextBytes
        );

        return dec.decode(plainBuffer);
    };

    const mountPrivateArticle = (gate) => {
        const wrapper = gate.closest(".private-main-article")?.parentElement || gate.parentElement;
        const payloadNode = wrapper.querySelector("[data-private-article-payload]");
        const content = wrapper.querySelector("[data-private-article-content]");
        const after = wrapper.querySelector("[data-private-article-after]");
        const form = gate.querySelector("form");
        const input = gate.querySelector("input[name='password']");
        const error = gate.querySelector("[data-private-article-error]");
        const storageKey = gate.dataset.storageKey || "";

        if (!payloadNode || !content || !form || !input || !error) {
            return;
        }

        const payload = JSON.parse(payloadNode.textContent || "{}");

        const hideError = () => {
            error.hidden = true;
            error.textContent = "";
        };

        const showError = (message) => {
            error.hidden = false;
            error.textContent = message;
        };

        const unlockArticle = (html) => {
            content.innerHTML = html;
            gate.hidden = true;
            content.hidden = false;
            if (after) {
                after.hidden = false;
            }
            document.body.classList.add("private-article-unlocked");

            try {
                window.sessionStorage.setItem(storageKey, html);
            } catch (err) {
                console.warn("Failed to persist article unlock state.", err);
            }
        };

        if (!window.crypto?.subtle || !window.TextEncoder || !window.TextDecoder) {
            showError("当前浏览器不支持文章解密。");
            return;
        }

        try {
            const cachedHtml = storageKey ? window.sessionStorage.getItem(storageKey) : "";
            if (cachedHtml) {
                unlockArticle(cachedHtml);
                return;
            }
        } catch (err) {
            console.warn("Failed to restore article unlock state.", err);
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            hideError();

            const password = input.value;
            if (!password) {
                showError("请输入密码。");
                return;
            }

            try {
                const plaintext = await decryptPayload(payload, password);
                const html = payload.format === "html" ? plaintext : renderMarkdown(plaintext);
                unlockArticle(html);
            } catch (err) {
                console.warn("Failed to decrypt article.", err);
                showError("密码错误，或密文数据已损坏。");
                input.select();
            }
        });
    };

    const boot = () => {
        document.querySelectorAll("[data-private-article]").forEach(mountPrivateArticle);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
