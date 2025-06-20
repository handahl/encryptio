# -*- coding: utf-8 -*-
"""
Created on Thu May 15 19:48:48 2025

@author: handahl
"""

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from yubikey_manager import YubiKey

def get_slot9a_private_key():
    """Retrieve existing private key from YubiKey Slot 9a"""
    yk = YubiKey()  # Initialize inside function to avoid global state
    try:
        return yk.get_piv_private_key(slot="9a")
    except Exception as e:
        print(f"Error accessing YubiKey: {e}")
        return None

def encrypt_message(public_key, message):
    """Encrypt using public key (OAEP with SHA-256)"""
    return public_key.encrypt(
        message.encode(),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

def decrypt_message(private_key, encrypted_message):
    """Decrypt using YubiKey's hardware-secured private key"""
    return private_key.decrypt(
        encrypted_message,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    ).decode()

if __name__ == "__main__":
    if (priv_key := get_slot9a_private_key()) is None:
        exit("Failed to access YubiKey. Check connection and slot 9a.")
    
    pub_key = priv_key.public_key()
    msg = "Secret message for YubiKey"
    
    encrypted = encrypt_message(pub_key, msg)
    print(f"Encrypted: {encrypted.hex()[:50]}...")  # Show first 50 chars
    
    decrypted = decrypt_message(priv_key, encrypted)
    print(f"Decrypted: {decrypted}")