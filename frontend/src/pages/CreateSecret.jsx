import { useEffect, useState } from "react";

import logoMark from "../assets/logo-transparent.png";
import GithubLink from "../components/GithubLink";

import {
    createSecret,
    reserveCode,
    attachCode,
    getByCode
} from "../api/secretApi";

import {
    generateKey,
    exportKey,
    encryptSecret,
    wrapKeyWithCode,
    unwrapKeyWithCode,
    decryptSecret
} from "../crypto/crypto";

const MAX_SECRET_LENGTH = 100000;

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
    }
];

export default function CreateSecret() {

    const [secret, setSecret] = useState("");
    const [ttl, setTtl] = useState(86400);
    const [views, setViews] = useState(1);

    useEffect(() => {
        document.title = "SecretSend — Secure One-Time Secret Sharing";
    }, []);

    const [shareUrl, setShareUrl] = useState("");
    const [linkLoading, setLinkLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const [code, setCode] = useState("");
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

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

    async function encryptAndCreate() {

        if (!secret.trim()) {
            return null;
        }

        if (secret.length > MAX_SECRET_LENGTH) {
            alert(
                `Secret is too long (max ${MAX_SECRET_LENGTH.toLocaleString()} characters)`
            );
            return null;
        }

        if (
            !views ||
            views < 1 ||
            views > 10
        ) {
            alert(
                "Views must be between 1 and 10"
            );
            return null;
        }

        const key = await generateKey();

        const encrypted = await encryptSecret(
            secret,
            key
        );

        const response = await createSecret({
            ciphertext: encrypted.ciphertext,
            nonce: encrypted.nonce,
            ttl,
            views
        });

        return {
            key,
            secretId: response.id
        };
    }

    async function handleGenerateLink() {

        try {

            setLinkLoading(true);

            setShareUrl("");

            const created = await encryptAndCreate();

            if (!created) {
                return;
            }

            const exportedKey = await exportKey(created.key);

            const url =
                `${window.location.origin}` +
                `/s/${created.secretId}` +
                `#${exportedKey}`;

            setShareUrl(url);

        } catch (err) {

            console.error(err);

            alert(err.message);

        } finally {

            setLinkLoading(false);

        }
    }

    async function handleGenerateCode() {

        try {

            setCodeLoading(true);

            setCode("");

            const created = await encryptAndCreate();

            if (!created) {
                return;
            }

            const reserved = await reserveCode(created.secretId);

            const wrapped = await wrapKeyWithCode(
                created.key,
                reserved.code
            );

            await attachCode(reserved.code, {
                wrapped_key: wrapped.wrappedKey,
                salt: wrapped.salt,
                iv: wrapped.iv
            });

            setCode(reserved.code);

        } catch (err) {

            console.error(err);

            alert(err.message);

        } finally {

            setCodeLoading(false);

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

    function handleRedeemAnother() {

        setRedeemedSecret("");

        setRedeemCode("");

        setRedeemError("");

    }

    return (
        <div className="page">

            <div className="card">

                <div className="topbar">

                    <img
                        className="logo-mark"
                        src={logoMark}
                        alt=""
                    />

                    <div>

                        <div className="logo">
                            SecretSend
                        </div>

                        <div className="tagline">
                            Secure Secret Sharing
                        </div>

                    </div>

                    <GithubLink />

                </div>

                <div className="info-box">

                    <strong>What is SecretSend?</strong>

                    <p>
                        SecretSend allows you to securely share
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

                <p className="small-text">
                    {secret.length.toLocaleString()} / {MAX_SECRET_LENGTH.toLocaleString()} characters
                </p>

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

                <div className="form-row">

                    <div>

                        <button
                            className="button"
                            onClick={handleGenerateLink}
                            disabled={linkLoading}
                        >
                            {
                                linkLoading
                                    ? "Creating Link..."
                                    : "Generate Link"
                            }
                        </button>

                        <p className="small-text">
                            A link with the decryption key attached —
                            anyone who opens it can view the secret.
                        </p>

                    </div>

                    <div>

                        <button
                            className="button"
                            onClick={handleGenerateCode}
                            disabled={codeLoading}
                        >
                            {
                                codeLoading
                                    ? "Generating Code..."
                                    : "Generate 6-Digit Code"
                            }
                        </button>

                        <p className="small-text">
                            A short code you can read aloud or type
                            elsewhere, for when sharing a link isn't possible.
                        </p>

                    </div>

                </div>

                {shareUrl && (

                    <div className="success-box">

                        <strong>
                            Secret Link Created
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

                    </div>

                )}

                {code && (

                    <div className="success-box">

                        <strong>
                            Secret Code Created
                        </strong>

                        <p>
                            Share the following code:
                        </p>

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

                        <div className="warning-box">

                            A 6-digit code is much weaker than
                            a link — anyone who guesses it can
                            unlock the secret. Prefer the link
                            whenever you can share one.

                        </div>

                    </div>

                )}

                <div className="section">

                    <label className="label">
                        Redeem a Code
                    </label>

                    <div className="info-box">

                        <p>
                            Were you given a 6-digit code instead
                            of a link? Enter it below to view and
                            decrypt the secret.
                        </p>

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

                                <button
                                    className="button"
                                    onClick={handleRedeemAnother}
                                >
                                    Redeem Another Code
                                </button>

                            </>

                        )}

                    </div>

                </div>

                <div className="footer">

                    SecretSend v1.0

                </div>

            </div>

        </div>
    );
}
