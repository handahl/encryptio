# -*- coding: utf-8 -*-
"""
Created on Thu May 15 20:50:20 2025

@author: handahl
"""

import os
import hashlib
import base64
import string
import random
import sys

# Try importing pyperclip, and set a flag if it's not available
try:
    import pyperclip
    clipboard_available = True
except ImportError:
    clipboard_available = False
    print("\nWarning: pyperclip package not installed.")
    print("Run 'pip install pyperclip' to enable automatic clipboard copying.\n")

def generate_password_from_yubikey_v2(yubikey_unique_data, full_service_name):
    """
    Generates a 20-character password based on YubiKey data and service name,
    using only the part before the final TLD. Both prefix and suffix are
    deterministically generated from the YubiKey and service name.
    Args:
        yubikey_unique_data (bytes): Unique and consistent data obtained from the YubiKey.
        full_service_name (str): The full service name (e.g., example.com,
                                        info.example.com, sub.domain.co.uk).
    Returns:
        str: A 20-character password.
    """
    parts = full_service_name.split('.')
    if len(parts) > 1:
        service_name = parts[-2]
    else:
        service_name = full_service_name

    # Create a unique hash for this service and YubiKey combination
    seed_data = yubikey_unique_data + service_name.encode('utf-8')
    main_hash = hashlib.sha256(seed_data).digest()

    # Use first part of hash for prefix generation
    prefix_seed = int.from_bytes(main_hash[:4], 'big')
    random.seed(prefix_seed)
    prefix_chars = string.ascii_lowercase + string.digits
    prefix = "".join(random.choice(prefix_chars) for _ in range(4)) + "."

    # Use second part of hash for suffix generation
    suffix_seed = int.from_bytes(main_hash[4:8], 'big')
    random.seed(suffix_seed)
    allowed_chars = string.ascii_letters + string.digits + "!@#$%^&*()_+=-`~[]\{}|;':\",./<>?"
    remaining_length = 20 - len(prefix) - len(service_name)
    suffix = "".join(random.choice(allowed_chars) for _ in range(max(0, remaining_length)))

    return f"{prefix}{service_name}{suffix}"

# --- YubiKey data retrieval without ykman dependency ---
def get_yubikey_data():
    """
    Get unique and consistent data from the YubiKey.
    This implementation provides a fallback using USB directly if yubikey-manager isn't available.
    """
    # First try using fallback options if ykman isn't available
    try:
        return get_yubikey_serial_direct()
    except:
        try:
            # Try using the yubikey-manager library if available
            # Uncomment the option you prefer:
            return get_yubikey_hmac_data()  # Requires HMAC-SHA1 slot configuration
            # return get_yubikey_piv_data()     # Requires PIV configuration
            # return get_yubikey_oath_data()    # Requires OATH TOTP configuration
            # return get_yubikey_serial()      # Simplest but less secure
        except Exception as e:
            print(f"Error accessing YubiKey: {e}")
            print("Falling back to demo mode...")
            return b"DEMO_MODE_NO_YUBIKEY"

def get_yubikey_serial_direct():
    """
    Get YubiKey serial number directly using PyUSB without requiring yubikey-manager.
    This is a simpler method that doesn't require additional dependencies beyond PyUSB.

    Requirements:
    - pip install pyusb
    """
    try:
        import usb.core
        import usb.util

        # YubiKey USB identifiers
        YUBICO_VID = 0x1050

        # Find all YubiKey devices
        devices = list(usb.core.find(find_all=True, idVendor=YUBICO_VID))

        if not devices:
            raise Exception("No YubiKey found")

        # Get device information
        device = devices[0]  # Use first YubiKey if multiple are connected

        # Create a unique identifier from device attributes
        serial_str = f"{device.idVendor}:{device.idProduct}:{device.serial_number if hasattr(device, 'serial_number') else ''}"
        serial_bytes = serial_str.encode('utf-8')

        # Hash it for consistency and security
        return hashlib.sha256(serial_bytes).digest()
    except ImportError:
        print("Error: pyusb package not installed.")
        print("Run: pip install pyusb")
        return b"DEMO_MODE_NO_YUBIKEY"
    except Exception as e:
        print(f"Error getting YubiKey serial directly: {e}")
        raise  # Let the caller handle this and try the next method

def get_yubikey_hmac_data():
    """
    Get unique data using YubiKey's HMAC-SHA1 Challenge-Response mode.
    This is a recommended approach as it's designed for this purpose.

    Requirements:
    - pip install pyusb yubikey-manager
    - YubiKey with HMAC-SHA1 slot configured (slot 2 is commonly used)
    """
    try:
        from ykman.device import connect_to_device
        from ykman.util import TRANSPORT
        import binascii

        # Connect to YubiKey
        dev = connect_to_device(transports=TRANSPORT.OTP)

        # Fixed challenge - always use the same challenge to get consistent results
        challenge = b"YubiKeyPasswordGenerator"

        # Use slot 2 for HMAC-SHA1 challenge-response (configure with YubiKey Manager first)
        slot = 2
        response = dev.driver.challenge_response(slot, challenge)

        return response
    except ImportError:
        print("Error: yubikey-manager package not installed.")
        print("Run: pip install pyusb yubikey-manager")
        return b"DEMO_MODE_NO_YUBIKEY"
    except Exception as e:
        print(f"Error communicating with YubiKey: {e}")
        print("Make sure your YubiKey is inserted and has HMAC-SHA1 configured in slot 2")
        return b"DEMO_MODE_NO_YUBIKEY"

def get_yubikey_piv_data():
    """
    Get unique data from YubiKey's PIV certificate.

    Requirements:
    - pip install pyusb pyscard cryptography
    - YubiKey with PIV configured
    """
    try:
        import cryptography
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        from smartcard.System import readers
        from smartcard.Exceptions import CardConnectionException

        # Connect to YubiKey as a smartcard
        r = readers()
        if len(r) == 0:
            raise Exception("No smartcard readers found")

        connection = r[0].createConnection()
        connection.connect()

        # Select PIV applet
        apdu = [0x00, 0xA4, 0x04, 0x00, 0x09, 0xA0, 0x00, 0x00, 0x03, 0x08, 0x00, 0x00, 0x10, 0x00]
        response, sw1, sw2 = connection.transmit(apdu)

        # Read certificate from slot 9A (PIV Authentication)
        apdu = [0x00, 0xCB, 0x3F, 0xFF, 0x05, 0x5C, 0x03, 0x5F, 0xC1, 0x05]
        response, sw1, sw2 = connection.transmit(apdu)

        # Parse certificate and get fingerprint
        cert = x509.load_der_x509_certificate(bytes(response), default_backend())
        fingerprint = cert.fingerprint(cryptography.hazmat.primitives.hashes.SHA256())

        return fingerprint
    except ImportError:
        print("Error: Required packages not installed.")
        print("Run: pip install pyusb pyscard cryptography")
        return b"DEMO_MODE_NO_YUBIKEY"
    except Exception as e:
        print(f"Error reading PIV certificate: {e}")
        return b"DEMO_MODE_NO_YUBIKEY"

def get_yubikey_oath_data():
    """
    Get unique data using YubiKey's OATH HOTP functionality.

    Requirements:
    - pip install pyusb yubikey-manager
    - YubiKey with OATH TOTP configured
    """
    try:
        from ykman.device import connect_to_device
        from ykman.util import TRANSPORT
        from ykman.oath import OathController

        # Connect to YubiKey
        dev = connect_to_device(transports=TRANSPORT.CCID)
        controller = OathController(dev.driver)

        # Get list of credentials (will be used to create a unique hash)
        creds = controller.list_credentials()
        if not creds:
            raise Exception("No OATH credentials found on YubiKey")

        # Use first credential ID as seed
        cred_id = creds[0].id.encode('utf-8')

        # Get TOTP code for the credential
        code = controller.calculate(creds[0].id)

        # Combine ID and code for uniqueness
        return hashlib.sha256(cred_id + code.encode('utf-8')).digest()
    except ImportError:
        print("Error: yubikey-manager package not installed.")
        print("Run: pip install pyusb yubikey-manager")
        return b"DEMO_MODE_NO_YUBIKEY"
    except Exception as e:
        print(f"Error accessing OATH data: {e}")
        return b"DEMO_MODE_NO_YUBIKEY"

# --- YubiKey data retrieval without ykman dependency ---
def get_yubikey_data():
    """
    Get unique and consistent data from the YubiKey.
    This implementation provides a fallback using USB directly if yubikey-manager isn't available.
    """
    # First try using fallback options if ykman isn't available
    try:
        return get_yubikey_serial_direct()
    except:
        try:
            # Try using the yubikey-manager library if available
            # Uncomment ONLY the option you prefer:
            # return get_yubikey_hmac_data()  # Requires HMAC-SHA1 slot configuration
            return get_yubikey_piv_data()     # Requires PIV configuration (slot 9A)
            # return get_yubikey_oath_data()    # Requires OATH TOTP configuration
            # return get_yubikey_serial()      # Simplest but less secure
        except Exception as e:
            print(f"Error accessing YubiKey: {e}")
            print("Falling back to demo mode...")
            return b"DEMO_MODE_NO_YUBIKEY"

if __name__ == "__main__":
    print("YubiKey Password Generator")
    print("=========================")

    try:
        yubikey_data = get_yubikey_data()
        if yubikey_data == b"DEMO_MODE_NO_YUBIKEY":
            print("\nRunning in DEMO mode! No YubiKey detected or required packages not installed.")
            print("To use with actual YubiKey, install required packages and configure your YubiKey.\n")
            print("Installation:")
            print("  pip install pyusb")
            print("  pip install yubikey-manager  # NOT ykman")
            print("  pip install pyscard cryptography")
            yubikey_data = hashlib.sha256(b"DEMO_KEY").digest()

        if len(sys.argv) > 1:
            # Use command line argument as service name
            service = sys.argv[1]
            password = generate_password_from_yubikey_v2(yubikey_data, service)
            print(f"\nGenerated password for {service}:\n{password}")
            if clipboard_available:
                pyperclip.copy(password)
                print("\nPassword copied to clipboard!")
        else:
            # Demo with example services
            print("\nGenerating example passwords:")

            services = [
                "example.com",
                "info.example.com",
                "sub.domain.co.uk",
                "localhost"
            ]

            for service in services:
                password = generate_password_from_yubikey_v2(yubikey_data, service)
                print(f"\nService: {service}")
                print(f"Password: {password}")

            # Show that passwords are consistent
            print("\nDemonstrating consistency (same service, same password):")
            password_again = generate_password_from_yubikey_v2(yubikey_data, services[0])
            print(f"Service: {services[0]} (again)")
            print(f"Password: {password_again}")

            print("\nUsage:")
            print(f"  python {sys.argv[0]} service-name.com")
    except Exception as e:
        print(f"\nError: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure your YubiKey is inserted")
        print("2. Install required packages: pip install pyusb yubikey-manager pyscard cryptography")
        print("3. Configure your YubiKey with YubiKey Manager if using HMAC-SHA1 or PIV")
        print("   - For HMAC-SHA1: Configure slot 2 with Challenge-Response mode")
        print("   - For PIV: Ensure a certificate is present in slot 9A")
    