import { useState } from "react";

import {
    createSecret,
    createCode,
    getByCode
} from "../api/secretApi";

import {
    generateKey,
    exportKey,
    encryptSecret,
    generateCode,
    wrapKeyWithCode,
    unwrapKeyWithCode,
    decryptSecret
} from "../crypto/crypto";

const CODE_RESERVE_ATTEMPTS = 5;

const TTL_OPTIONS = [
    {
        label: "1 Minute",
        value: 60
    },
    {
        label: "5 Minutes",
        value: 300
    },
    {
        label: "15 Minutes",
        value: 900
    },
    {
        label: "1 Hour",
        value: 3600
    },
    {
        label: "6 Hours",
        value: 21600
    },
    {
        label: "1 Day",
        value: 86400
    },
    {
        label: "1 Week",
        value: 604800
    }
];

export default function CreateSecret() {

    const [secret, setSecret] = useState("");
    const [shareUrl, setShareUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [ttl, setTtl] = useState(86400);
    const [copied, setCopied] = useState(false);
    const [views, setViews] = useState(1);

    const [secretId, setSecretId] = useState("");
    const [secretKey, setSecretKey] = useState(null);
    const [code, setCode] = useState("");
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    const [showRedeem, setShowRedeem] = useState(false);
    const [redeemCode, setRedeemCode] = useState("");
    const [redeemLoading, setRedeemLoading] = useState(false);
    const [redeemError, setRedeemError] = useState("");
    const [redeemedSecret, setRedeemedSecret] = useState("");
    const [redeemedCopied, setRedeemedCopied] = useState(false);

    function handleViewsChange(e) {

        const value = e.target.value;

        if (value === "") {
            setViews("");
            return;
        }

        const number = Number(value);

        if (
            number >= 1 &&
            number <= 10
        ) {
            setViews(number);
        }
    }

    async function handleCreate() {

        if (!secret.trim()) {
            return;
        }

        if (
            !views ||
            views < 1 ||
            views > 10
        ) {
            alert(
                "Views must be between 1 and 10"
            );
            return;
        }

        try {

            setLoading(true);

            setCode("");

            // Generate AES key
            const key =
                await generateKey();

            // Encrypt secret
            const encrypted =
                await encryptSecret(
                    secret,
                    key
                );

            // Send ciphertext to backend
            const response =
                await createSecret({
                    ciphertext:
                        encrypted.ciphertext,
                    nonce:
                        encrypted.nonce,
                    ttl,
                    views
                });

            // Export key
            const exportedKey =
                await exportKey(key);

            // Build URL
            const url =
                `${window.location.origin}` +
                `/s/${response.id}` +
                `#${exportedKey}`;

            setShareUrl(url);
            setSecretId(response.id);
            setSecretKey(key);

        } catch (err) {

            console.error(err);

            alert(err.message);

        } finally {

            setLoading(false);

        }
    }

    async function handleGetCode() {

        try {

            setCodeLoading(true);

            for (
                let attempt = 0;
                attempt < CODE_RESERVE_ATTEMPTS;
                attempt++
            ) {

                const candidate = generateCode();

                const wrapped =
                    await wrapKeyWithCode(
                        secretKey,
                        candidate
                    );

                try {

                    await createCode(secretId, {
                        code: candidate,
                        wrapped_key: wrapped.wrappedKey,
                        salt: wrapped.salt,
                        iv: wrapped.iv
                    });

                    setCode(candidate);

                    return;

                } catch (err) {

                    if (err.code !== "CODE_CONFLICT") {
                        throw err;
                    }

                    // Code already taken, try another one
                }
            }

            throw new Error(
                "Could not generate a unique code, please try again"
            );

        } catch (err) {

            console.error(err);

            alert(err.message);

        } finally {

            setCodeLoading(false);

        }
    }

    async function handleCopyCode() {

        try {

            await navigator.clipboard.writeText(code);

            setCodeCopied(true);

            setTimeout(() => {
                setCodeCopied(false);
            }, 2000);

        } catch (err) {

            console.error(err);

            alert(
                "Failed to copy code"
            );
        }
    }

    function handleRedeemCodeChange(e) {

        const digitsOnly =
            e.target.value.replace(/\D/g, "");

        setRedeemCode(digitsOnly.slice(0, 6));
    }

    async function handleRedeem() {

        if (redeemCode.length !== 6) {
            setRedeemError("Enter the full 6-digit code");
            return;
        }

        try {

            setRedeemLoading(true);
            setRedeemError("");

            const data = await getByCode(redeemCode);

            const key =
                await unwrapKeyWithCode(
                    data.wrapped_key,
                    data.salt,
                    data.iv,
                    redeemCode
                );

            const plaintext =
                await decryptSecret(
                    data.ciphertext,
                    data.nonce,
                    key
                );

            setRedeemedSecret(plaintext);

        } catch (err) {

            console.error(err);

            setRedeemError(err.message);

        } finally {

            setRedeemLoading(false);

        }
    }

    async function handleCopyRedeemed() {

        try {

            await navigator.clipboard.writeText(
                redeemedSecret
            );

            setRedeemedCopied(true);

            setTimeout(() => {
                setRedeemedCopied(false);
            }, 2000);

        } catch (err) {

            console.error(err);

            alert(
                "Failed to copy secret"
            );
        }
    }

    async function handleCopy() {

        try {

            await navigator.clipboard.writeText(
                shareUrl
            );

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);

        } catch (err) {

            console.error(err);

            alert(
                "Failed to copy link"
            );
        }
    }

    return (
        <div className="page">

            <div className="card">

                <div className="topbar">

                    <div className="logo">
                        SecretShare
                    </div>

                    <div className="tagline">
                        Secure Secret Sharing
                    </div>

                </div>

                <div className="info-box">

                    <strong>What is SecretShare?</strong>

                    <p>
                        SecretShare allows you to securely share
                        passwords, API keys, access tokens and
                        confidential information using encrypted
                        self-destructing links.
                    </p>

                    <ul>
                        <li>Client side AES-GCM encryption</li>
                        <li>Secrets are encrypted before leaving your browser</li>
                        <li>Automatic expiration</li>
                        <li>Configurable view limits</li>
                        <li>No plaintext stored on the server</li>
                    </ul>

                </div>

                <label className="label">
                    Secret
                </label>

                <textarea
                    className="textarea"
                    value={secret}
                    onChange={(e) =>
                        setSecret(e.target.value)
                    }
                />

                <div className="form-row">

                    <div>

                        <label className="label">
                            Expiration
                        </label>

                        <select
                            className="select"
                            value={ttl}
                            onChange={(e) =>
                                setTtl(Number(e.target.value))
                            }
                        >
                            {TTL_OPTIONS.map(option => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>

                    </div>

                    <div>

                        <label className="label">
                            Views Allowed
                        </label>

                        <input
                            className="input"
                            type="number"
                            min="1"
                            max="10"
                            value={views}
                            onChange={handleViewsChange}
                        />

                    </div>

                </div>

                <button
                    className="button"
                    onClick={handleCreate}
                    disabled={loading}
                >
                    {
                        loading
                            ? "Creating Link..."
                            : "Generate Link"
                    }
                </button>

                {shareUrl && (

                    <div className="success-box">

                        <strong>
                            Secret Created Successfully
                        </strong>

                        <p>
                            Share the following link:
                        </p>

                        <textarea
                            className="textarea share-box"
                            readOnly
                            value={shareUrl}
                        />

                        <button
                            className="button"
                            onClick={handleCopy}
                        >
                            {
                                copied
                                    ? "Copied!"
                                    : "Copy Link"
                            }
                        </button>

                        <div className="warning-box">

                            Anyone with this link can access
                            the secret until it expires or
                            reaches its view limit.

                        </div>

                        <hr />

                        <strong>
                            Can't share the link?
                        </strong>

                        <p>
                            Generate a 6-digit code instead.
                            It shares the same expiration and
                            view limit as the link above.
                        </p>

                        {code ? (

                            <>

                                <div className="code-display">
                                    {code}
                                </div>

                                <button
                                    className="button"
                                    onClick={handleCopyCode}
                                >
                                    {
                                        codeCopied
                                            ? "Copied!"
                                            : "Copy Code"
                                    }
                                </button>

                            </>

                        ) : (

                            <button
                                className="button"
                                onClick={handleGetCode}
                                disabled={codeLoading}
                            >
                                {
                                    codeLoading
                                        ? "Generating Code..."
                                        : "Get Code"
                                }
                            </button>

                        )}

                        <div className="warning-box">

                            A 6-digit code is much weaker than
                            the link — anyone who guesses it
                            can unlock the secret. Only use it
                            when you have no other way to share
                            the link, and prefer the link
                            whenever possible.

                        </div>

                    </div>

                )}

                <div className="section">

                    <button
                        className="link-button"
                        onClick={() =>
                            setShowRedeem(v => !v)
                        }
                    >
                        {
                            showRedeem
                                ? "Hide code redemption"
                                : "Have a code instead of a link? Redeem it here"
                        }
                    </button>

                    {showRedeem && (

                        <div className="info-box">

                            {!redeemedSecret ? (

                                <>

                                    <label className="label">
                                        Enter Code
                                    </label>

                                    <input
                                        className="input"
                                        value={redeemCode}
                                        onChange={handleRedeemCodeChange}
                                        inputMode="numeric"
                                        placeholder="000000"
                                        maxLength={6}
                                    />

                                    {redeemError && (

                                        <div className="warning-box">
                                            {redeemError}
                                        </div>

                                    )}

                                    <button
                                        className="button"
                                        onClick={handleRedeem}
                                        disabled={redeemLoading}
                                    >
                                        {
                                            redeemLoading
                                                ? "Retrieving..."
                                                : "Redeem Code"
                                        }
                                    </button>

                                </>

                            ) : (

                                <>

                                    <label className="label">
                                        Secret Content
                                    </label>

                                    <textarea
                                        className="textarea"
                                        readOnly
                                        value={redeemedSecret}
                                    />

                                    <button
                                        className="button"
                                        onClick={handleCopyRedeemed}
                                    >
                                        {
                                            redeemedCopied
                                                ? "Copied!"
                                                : "Copy Secret"
                                        }
                                    </button>

                                </>

                            )}

                        </div>

                    )}

                </div>

                <div className="footer">

                    SecretShare v1.0

                </div>

            </div>

        </div>
    );
}