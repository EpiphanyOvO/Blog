const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

function base64ToBytes(value) {
    const normalized = (value || '').replace(/\s+/g, '');
    const binary = atob(normalized);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function concatBytes(left, right) {
    const merged = new Uint8Array(left.length + right.length);
    merged.set(left, 0);
    merged.set(right, left.length);
    return merged;
}

function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

async function deriveKeys(password, saltBytes, iterations) {
    const material = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations,
            hash: 'SHA-256',
        },
        material,
        512
    );

    const keyBytes = new Uint8Array(derivedBits);
    const encryptionKeyBytes = keyBytes.slice(0, 32);
    const macKeyBytes = keyBytes.slice(32, 64);

    const encryptionKey = await crypto.subtle.importKey(
        'raw',
        encryptionKeyBytes,
        { name: 'AES-CBC' },
        false,
        ['encrypt', 'decrypt']
    );

    const macKey = await crypto.subtle.importKey(
        'raw',
        macKeyBytes,
        {
            name: 'HMAC',
            hash: 'SHA-256',
        },
        false,
        ['sign', 'verify']
    );

    return { encryptionKey, macKey };
}

export async function encryptPrivateBody(plaintext, password, options = {}) {
    if (!password) {
        throw new Error('私密文章必须提供密码。');
    }

    const iterations = Number(options.iterations) || 310000;
    const format = options.format || 'markdown';
    const saltBytes = randomBytes(16);
    const ivBytes = randomBytes(16);
    const { encryptionKey, macKey } = await deriveKeys(password, saltBytes, iterations);

    const plainBytes = enc.encode(plaintext);
    const cipherBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-CBC',
            iv: ivBytes,
        },
        encryptionKey,
        plainBytes
    );

    const cipherBytes = new Uint8Array(cipherBuffer);
    const macInput = concatBytes(ivBytes, cipherBytes);
    const macBuffer = await crypto.subtle.sign('HMAC', macKey, macInput);
    const macBytes = new Uint8Array(macBuffer);
    const payloadBytes = concatBytes(cipherBytes, macBytes);

    return {
        private: true,
        privateFormat: format,
        privateIterations: iterations,
        privateSalt: bytesToBase64(saltBytes),
        privateIv: bytesToBase64(ivBytes),
        privateCiphertext: bytesToBase64(payloadBytes),
    };
}

export async function decryptPrivateBody(payload, password) {
    if (!password) {
        throw new Error('请输入私密文章密码。');
    }

    const saltBytes = base64ToBytes(payload.privateSalt || payload.salt);
    const ivBytes = base64ToBytes(payload.privateIv || payload.iv);
    const payloadBytes = base64ToBytes(payload.privateCiphertext || payload.ciphertext);
    const iterations = Number(payload.privateIterations || payload.iterations) || 310000;

    if (payloadBytes.length <= 32) {
        throw new Error('密文数据无效。');
    }

    const cipherBytes = payloadBytes.slice(0, payloadBytes.length - 32);
    const macBytes = payloadBytes.slice(payloadBytes.length - 32);
    const macInput = concatBytes(ivBytes, cipherBytes);
    const { encryptionKey, macKey } = await deriveKeys(password, saltBytes, iterations);

    const valid = await crypto.subtle.verify('HMAC', macKey, macBytes, macInput);
    if (!valid) {
        throw new Error('密码错误，或密文已损坏。');
    }

    const plainBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-CBC',
            iv: ivBytes,
        },
        encryptionKey,
        cipherBytes
    );

    return dec.decode(plainBuffer);
}
