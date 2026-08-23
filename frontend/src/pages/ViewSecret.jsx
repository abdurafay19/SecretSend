import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

import { getSecret } from "../api/secretApi";

import {
    importKey,
    decryptSecret
} from "../crypto/crypto";

export default function ViewSecret() {

    const fetched = useRef(false);

    const { id } = useParams();

    useEffect(() => {
        document.title = "View Secret — SecretShare";
    }, []);

    const [secret, setSecret] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [secretCopied, setSecretCopied] =
        useState(false);

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

    useEffect(() => {

        async function loadSecret() {

            try {

                const keyBase64 =
                    window.location.hash.substring(1);

                if (!keyBase64) {
                    throw new Error(
                        "Missing decryption key"
                    );
                }

                const key =
                    await importKey(
                        keyBase64
                    );

                const data =
                    await getSecret(id);

                const plaintext =
                    await decryptSecret(
                        data.ciphertext,
                        data.nonce,
                        key
                    );

                setSecret(
                    plaintext
                );

            } catch (err) {

                console.error(err);

                setError(
                    err.message
                );

            } finally {

                setLoading(false);

            }
        }

        if (fetched.current) {
            return;
        }

        fetched.current = true;

        loadSecret();

    }, [id]);

    if (loading) {

        return (

            <div className="page">

                <div className="card">

                    <div className="topbar">

                        <div className="logo">
                            SecretShare
                        </div>

                        <div className="tagline">
                            Secret Retrieval
                        </div>

                    </div>

                    <h2>
                        Retrieving Secret
                    </h2>

                    <p>
                        Downloading encrypted data...
                    </p>

                    <p>
                        Decrypting in your browser...
                    </p>

                </div>

            </div>

        );
    }

    if (error) {

        return (

            <div className="page">

                <div className="card">

                    <div className="topbar">

                        <div className="logo">
                            SecretShare
                        </div>

                        <div className="tagline">
                            Secret Retrieval
                        </div>

                    </div>

                    <div className="warning-box">

                        <strong>
                            Secret Unavailable
                        </strong>

                        <p>
                            This secret can no longer
                            be accessed.
                        </p>

                        <ul>
                            <li>
                                It may have expired.
                            </li>

                            <li>
                                It may have reached
                                its view limit.
                            </li>

                            <li>
                                The link may be invalid.
                            </li>
                        </ul>

                    </div>

                    <div className="footer">

                        SecretShare v1.0

                    </div>

                </div>

            </div>

        );
    }

    return (

        <div className="page">

            <div className="card">

                <div className="topbar">

                    <div className="logo">
                        SecretShare
                    </div>

                    <div className="tagline">
                        Secret Retrieval
                    </div>

                </div>

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

                <div className="footer">

                    SecretShare v1.0

                </div>

            </div>

        </div>

    );
}