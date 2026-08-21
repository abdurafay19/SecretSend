from pydantic import BaseModel
from pydantic import Field

class CreateSecretRequest(BaseModel):
    ciphertext: str
    nonce: str
    ttl: int
    views: int = Field(
        default=1,
        ge=1,
        le=10
    )

class SecretResponse(BaseModel):
    id: str

class CreateCodeRequest(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")
    wrapped_key: str
    salt: str
    iv: str

class CodeResponse(BaseModel):
    code: str

class SecretByCodeResponse(BaseModel):
    ciphertext: str
    nonce: str
    wrapped_key: str
    salt: str
    iv: str