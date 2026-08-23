from pydantic import BaseModel
from pydantic import Field

class CreateSecretRequest(BaseModel):
    ciphertext: str = Field(max_length=140000)
    nonce: str = Field(max_length=32)
    ttl: int = Field(
        ge=60,
        le=86400
    )
    views: int = Field(
        default=1,
        ge=1,
        le=10
    )

class SecretResponse(BaseModel):
    id: str

class AttachCodeRequest(BaseModel):
    wrapped_key: str = Field(max_length=200)
    salt: str = Field(max_length=64)
    iv: str = Field(max_length=64)

class CodeResponse(BaseModel):
    code: str

class SecretByCodeResponse(BaseModel):
    ciphertext: str
    nonce: str
    wrapped_key: str
    salt: str
    iv: str