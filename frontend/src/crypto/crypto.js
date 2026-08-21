export async function generateKey() {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function exportKey(key) {

    const raw = await crypto.subtle.exportKey(
        "raw",
        key
    );

    return btoa(
        String.fromCharCode(
            ...new Uint8Array(raw)
        )
    );
}

export async function importKey(base64Key) {

    const bytes = Uint8Array.from(
        atob(base64Key),
        c => c.charCodeAt(0)
    );

    return await crypto.subtle.importKey(
        "raw",
        bytes,
        {
            name: "AES-GCM"
        },
        true,
        ["decrypt"]
    );
}

export async function encryptSecret(
    plaintext,
    key
) {

    const iv =
        crypto.getRandomValues(
            new Uint8Array(12)
        );

    const encoded =
        new TextEncoder().encode(
            plaintext
        );

    const encrypted =
        await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            encoded
        );

    return {
        ciphertext: btoa(
            String.fromCharCode(
                ...new Uint8Array(encrypted)
            )
        ),
        nonce: btoa(
            String.fromCharCode(...iv)
        )
    };
}

const CODE_PBKDF2_ITERATIONS = 600000;

export function generateCode() {

    const array = new Uint32Array(1);

    crypto.getRandomValues(array);

    return (array[0] % 1000000)
        .toString()
        .padStart(6, "0");
}

function toBase64(bytes) {
    return btoa(
        String.fromCharCode(...bytes)
    );
}

function fromBase64(value) {
    return Uint8Array.from(
        atob(value),
        c => c.charCodeAt(0)
    );
}

async function deriveKeyFromCode(code, salt) {

    const baseKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(code),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: CODE_PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        baseKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function wrapKeyWithCode(secretKey, code) {

    const salt =
        crypto.getRandomValues(new Uint8Array(16));

    const iv =
        crypto.getRandomValues(new Uint8Array(12));

    const wrappingKey =
        await deriveKeyFromCode(code, salt);

    const rawKey =
        await crypto.subtle.exportKey(
            "raw",
            secretKey
        );

    const wrapped =
        await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv
            },
            wrappingKey,
            rawKey
        );

    return {
        wrappedKey: toBase64(new Uint8Array(wrapped)),
        salt: toBase64(salt),
        iv: toBase64(iv)
    };
}

export async function unwrapKeyWithCode(
    wrappedKeyBase64,
    saltBase64,
    ivBase64,
    code
) {

    const salt = fromBase64(saltBase64);
    const iv = fromBase64(ivBase64);
    const wrapped = fromBase64(wrappedKeyBase64);

    const wrappingKey =
        await deriveKeyFromCode(code, salt);

    const rawKey =
        await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            wrappingKey,
            wrapped
        );

    return await crypto.subtle.importKey(
        "raw",
        rawKey,
        {
            name: "AES-GCM"
        },
        true,
        ["decrypt"]
    );
}

export async function decryptSecret(
    ciphertext,
    nonce,
    key
) {

    const cipherBytes =
        Uint8Array.from(
            atob(ciphertext),
            c => c.charCodeAt(0)
        );

    const nonceBytes =
        Uint8Array.from(
            atob(nonce),
            c => c.charCodeAt(0)
        );

    const decrypted =
        await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: nonceBytes
            },
            key,
            cipherBytes
        );

    return new TextDecoder()
        .decode(decrypted);
}