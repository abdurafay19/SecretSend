const API_URL =
    import.meta.env.VITE_API_URL || "";

export async function createSecret(data) {
    const response = await fetch(
        `${API_URL}/api/secrets`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create secret");
    }

    return await response.json();
}

export async function getSecret(id) {
    const response = await fetch(
        `${API_URL}/api/secrets/${id}`
    );

    if (!response.ok) {
        throw new Error("Secret not found");
    }

    return await response.json();
}

export async function reserveCode(secretId) {
    const response = await fetch(
        `${API_URL}/api/secrets/${secretId}/code`,
        {
            method: "POST"
        }
    );

    if (!response.ok) {
        throw new Error("Failed to reserve code");
    }

    return await response.json();
}

export async function attachCode(code, data) {
    const response = await fetch(
        `${API_URL}/api/codes/${code}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {
        throw new Error("Failed to attach code");
    }

    return await response.json();
}

export async function getByCode(code) {
    const response = await fetch(
        `${API_URL}/api/codes/${code}`
    );

    if (response.status === 429) {
        throw new Error(
            "Too many attempts. Please wait and try again."
        );
    }

    if (!response.ok) {
        throw new Error("Invalid or expired code");
    }

    return await response.json();
}