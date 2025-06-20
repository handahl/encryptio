# YubiKey Security Toolkit

A comprehensive security toolkit that leverages YubiKey hardware for deterministic password generation, secure encryption, and date encoding operations. This project provides multiple authentication methods and encoding schemes to enhance security workflows.

## Features

### 🔐 Deterministic Password Generation
- **Hardware-backed security**: Uses YubiKey's unique hardware identifiers
- **Service-specific passwords**: Generates unique 20-character passwords per service
- **Multiple authentication methods**: HMAC-SHA1, PIV, OATH, or serial-based
- **Consistent output**: Same service always generates the same password
- **Domain intelligence**: Extracts service name from full domains (e.g., `sub.example.com` → `example`)

### 🛡️ YubiKey PIV Encryption
- **Hardware-secured private keys**: Uses YubiKey slot 9A for encryption/decryption
- **OAEP padding**: Industry-standard RSA encryption with SHA-256
- **Tamper-resistant**: Private keys never leave the hardware security module

### 📅 Date Encoding System
- **XOR-based encoding**: Encodes dates using year-dependent XOR operations
- **Compact representation**: 5-character encoded format
- **Supports multiple formats**: `dd.mm.yyyy` and `dd.mm.yy` input formats

## Installation

### Prerequisites
```bash
# Core dependencies
pip install pyusb hashlib

# Optional: For clipboard support
pip install pyperclip

# For YubiKey Manager integration
pip install yubikey-manager

# For PIV certificate operations
pip install pyscard cryptography
```

### YubiKey Configuration

#### Option 1: HMAC-SHA1 Challenge-Response (Recommended)
```bash
# Configure slot 2 for HMAC-SHA1
ykman otp chalresp --touch --generate 2
```

#### Option 2: PIV Certificate
```bash
# Generate PIV certificate in slot 9A
ykman piv keys generate --algorithm RSA2048 9a pubkey.pem
ykman piv certificates generate --subject "CN=YubiKey User" 9a pubkey.pem
```

#### Option 3: Direct USB (Fallback)
No additional configuration required - uses USB device identifiers.

## Usage

### Password Generation

#### Command Line
```bash
# Generate password for a specific service
python fixed-password-generator.py example.com

# Output: Generated password for example.com:
# abc4.example$@#xyz
```

#### Interactive Mode
```bash
python fixed-password-generator.py

# Shows example passwords for multiple services
# Demonstrates consistency across runs
```

### Date Encoding
```python
from date_encoder import encode_date_xor_year, decode_date_xor_year

# Encode a date
encoded = encode_date_xor_year("15.05.2025")
print(encoded)  # Output: JBZAA

# Decode back to original date
decoded = decode_date_xor_year(encoded)
print(decoded)  # Output: 15.05.2025
```

### PIV Encryption
```python
from yubikey_piv import get_slot9a_private_key, encrypt_message, decrypt_message

private_key = get_slot9a_private_key()
public_key = private_key.public_key()

# Encrypt sensitive data
encrypted = encrypt_message(public_key, "Secret message")

# Decrypt using hardware-secured key
decrypted = decrypt_message(private_key, encrypted)
```

## How It Works

### Password Generation Algorithm

1. **Service Extraction**: Extracts the primary domain from full service names
   - `info.example.com` → `example`
   - `sub.domain.co.uk` → `domain`

2. **Seed Generation**: Combines YubiKey unique data with service name
   ```python
   seed_data = yubikey_unique_data + service_name.encode('utf-8')
   main_hash = hashlib.sha256(seed_data).digest()
   ```

3. **Component Generation**:
   - **Prefix**: 4 lowercase/digit characters + "."
   - **Service**: Extracted service name
   - **Suffix**: Special characters to reach 20 total length

4. **Deterministic Randomness**: Uses hash-derived seeds for consistent output

### Date Encoding Mechanism

1. **XOR Operation**: Day and month are XORed with the year's last digit
2. **Character Mapping**:
   - Month (1-12) → A-L
   - Day (1-31) → AA-BE 
   - Year (00-99) → AA-DZ

3. **Reversible**: Decoding requires knowledge of the encoding year

### Security Considerations

- **Hardware Root of Trust**: YubiKey provides tamper-resistant key storage
- **No Password Storage**: Passwords are generated deterministically, never stored
- **Multiple Fallbacks**: Graceful degradation if hardware unavailable
- **Service Isolation**: Each service gets a unique, unrelated password

## File Structure

```
yubikey-security-toolkit/
├── fixed-password-generator.py      # Main password generator
├── fixed-password-generator (1).py  # YubiKey Manager version  
├── fixed-password-generator (2).py  # Enhanced with USB fallback
├── untitled0.py                     # PIV encryption utilities
├── untitled0 (2).py                 # PIV + clipboard support
├── untitled0 (3).py                 # Latest PIV implementation
├── 1810.py                          # Date encoding system
└── README.md                        # This file
```

## Compatibility

- **Operating Systems**: Windows, macOS, Linux
- **Python**: 3.6+
- **YubiKey Models**: All models with PIV/HMAC-SHA1 support
- **Browsers**: Future web version planned with WebAuthn/FIDO2

## Security Warnings

⚠️ **Hardware Dependency**: Passwords are tied to specific YubiKey hardware. Loss of device requires password reset for all services.

⚠️ **Demo Mode**: When YubiKey unavailable, system falls back to demo mode with reduced security.

⚠️ **Year Dependency**: Date encoding requires year context for proper decoding.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE.md](LICENSE.md) file for details.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

## Support

- **Issues**: Report bugs via GitHub issues
- **Documentation**: Check wiki for detailed configuration guides
- **Community**: Join discussions in GitHub Discussions

---

**Built with security-first principles and hardware-backed trust.**