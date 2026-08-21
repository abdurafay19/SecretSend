import { useState } from "react";
import { Link } from "react-router-dom";

import { getByCode } from "../api/secretApi";

import {
    unwrapKeyWithCode,
    decryptSecret
} from "../crypto/crypto";

export default function RedeemCode() {

    const [code, setCode] = useState("");
    const [secret, setSecret] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [secretCopied, setSecretCopied] = useState(false);

    function handleCodeChange(e) {

        const digitsOnly =
            e.target.value.replace(/\D/g, "");

        setCode(digitsOnly.slice(0, 6));
    }

    async function handleRedeem() {

        if (code.length !== 6) {
            setError("Enter the full 6-digit code");
            return;
        }

        try {

            setLoading(true);
            setError("");

            const data = await getByCode(code);

            const key =
                await unwrapKeyWithCode(
                    data.wrapped_key,
                    data.salt,
                    data.iv,
                    code
                );

            const plaintext =
                await decryptSecret(
                    data.ciphertext,
                    data.nonce,
                    key
                );

            setSecret(plaintext);

        } catch (err) {

            console.error(err);

            setError(err.message);

        } finally {

            setLoading(false);

        }
    }

    async function handleCopySecret() {

        try {

            await navigator.clipboard.writeText(
                secret
            );

            setSecretCopied(true);

            setTimeout(() => {
                setSecretCopied(false);
            }, 2000);

        } catch (err) {

            console.error(err);

            alert(
                "Failed to copy secret"
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
                        Redeem Code
                    </div>

                </div>

                {!secret && (

                    <>

                        <div className="info-box">

                            <strong>
                                Enter your 6-digit code
                            </strong>

                            <p>
                                The secret will be decrypted
                                locally in your browser.
                            </p>

                        </div>

                        <label className="label">
                            Code
                        </label>

                        <input
                            className="input code-display"
                            value={code}
                            onChange={handleCodeChange}
                            inputMode="numeric"
                            placeholder="000000"
                            maxLength={6}
                        />

                        {error && (

                            <div className="warning-box">
                                {error}
                            </div>

                        )}

                        <button
                            className="button"
                            onClick={handleRedeem}
                            disabled={loading}
                        >
                            {
                                loading
                                    ? "Retrieving..."
                                    : "Redeem Code"
                            }
                        </button>

                    </>

                )}

                {secret && (

                    <>

                        <div className="info-box">

                            <strong>
                                Secret Retrieved
                            </strong>

                            <p>
                                The secret has been decrypted
                                locally in your browser.
                            </p>

                            <p>
                                Depending on its configuration,
                                this secret may no longer be
                                available after viewing.
                            </p>

                        </div>

                        <label className="label">
                            Secret Content
                        </label>

                        <textarea
                            className="textarea"
                            readOnly
                            value={secret}
                        />

                        <button
                            className="button"
                            onClick={handleCopySecret}
                        >
                            {
                                secretCopied
                                    ? "Copied!"
                                    : "Copy Secret"
                            }
                        </button>

                    </>

                )}

                <p className="small-text">
                    <Link to="/">
                        Back to home
                    </Link>
                </p>

                <div className="footer">

                    SecretShare v1.0

                </div>

            </div>

        </div>

    );
}
