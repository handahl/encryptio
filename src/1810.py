# -*- coding: utf-8 -*-
"""
Created on Thu May 15 12:09:00 2025
@author: handahl
"""

def encode_date_xor_year(date_str):
    """
    Encodes a date string (dd.mm.yyyy or dd.mm.yy) with the day always as two letters,
    using a mapping that avoids overlap with months, and XORing month and day with the last digit of the year.
    """
    parts = date_str.split('.')
    if len(parts) == 3:
        day_str, month_str, year_str = parts
        if len(day_str) == 2 and day_str.isdigit() and \
           len(month_str) == 2 and month_str.isdigit():
            if len(year_str) == 4 and year_str.isdigit():
                pass
            elif len(year_str) == 2 and year_str.isdigit():
                year_str = f"20{year_str}"
            else:
                raise ValueError("Invalid year format (must be yy or<ctrl98>)")
        else:
            raise ValueError("Invalid day or month format (must be dd and mm)")
    else:
        raise ValueError("Invalid date format. Use dd.mm.yyyy or dd.mm.yy")

    month = int(month_str)
    day = int(day_str)
    year_last_digit = int(year_str[-1])

    # XOR operation
    modified_month = month ^ year_last_digit
    modified_day = day ^ year_last_digit

    # Mapping:
    # Modified Month (after XOR) -> A-L (We need to ensure the range stays within 1-12 or handle overflow)
    month_char = chr(ord('A') + (modified_month % 12)) # Modulo to keep within 0-11

    # Modified Day (after XOR) -> AA-BE (We need to handle potential range changes after XOR)
    day_index = (modified_day % 31) # Modulo to keep within 0-30
    day_char1 = chr(ord('A') + day_index // 26)
    day_char2 = chr(ord('A') + day_index % 26)
    day_chars = f"{day_char1}{day_char2}"

    # Year (Last Two Digits 00-99) -> A-Z, AA-AZ, BA-BZ, ..., DA-DZ
    year_last_two = int(year_str[-2:])
    year_char_index = year_last_two
    year_char1 = chr(ord('A') + year_char_index // 26)
    year_char2 = chr(ord('A') + year_char_index % 26)
    year_chars = f"{year_char1}{year_char2}"

    return f"{month_char}{day_chars}{year_chars}"

def decode_date_xor_year(ciphered_str):
    if len(ciphered_str) != 5:
        raise ValueError("Invalid ciphered string length (expected 5 characters)")

    month_char = ciphered_str[0]
    day_char1 = ciphered_str[1]
    day_char2 = ciphered_str[2]
    year_char1 = ciphered_str[3]
    year_char2 = ciphered_str[4]

    encoded_month = ord(month_char) - ord('A') + 1
    encoded_day_index = (ord(day_char1) - ord('A')) * 26 + (ord(day_char2) - ord('A'))
    encoded_day = encoded_day_index + 1
    year_last_two = (ord(year_char1) - ord('A')) * 26 + (ord(year_char2) - ord('A'))

    # Re-calculate the year's last digit (we need the original year to decode)
    # For now, we'll assume the current year (2025) for decoding examples.
    # In a real scenario, you'd need to know the year of encoding to decode correctly.
    current_year_last_digit = 5

    # Reverse the XOR operation
    original_month = encoded_month ^ current_year_last_digit
    original_day = encoded_day ^ current_year_last_digit

    # Basic sanity checks (you might need more robust validation)
    month = (original_month % 12) if (original_month % 12) != 0 else 12
    day = (original_day % 31) if (original_day % 31) != 0 else 31

    current_year = 2025
    year_full = current_year // 100 * 100 + year_last_two
    if year_full > current_year + 50:
        year_full -= 100

    return f"{day:02d}.{month:02d}.{year_full}"

# Example usage
encoded_2023 = encode_date_xor_year("15.05.2023")
print(f"15.05.2023 encoded: {encoded_2023}") # Expected: (15^3=12 -> L), (5^3=6 -> FG), (23 -> AX) -> LFG AX

encoded_2024 = encode_date_xor_year("15.05.2024")
print(f"15.05.2024 encoded: {encoded_2024}") # Expected: (15^4=11 -> K), (5^4=1 -> AB), (24 -> AY) -> KAB AY

encoded_2025 = encode_date_xor_year("15.05.2025")
print(f"15.05.2025 encoded: {encoded_2025}") # Expected: (15^5=10 -> J), (5^5=0 -> AA), (25 -> BZ) -> JAA BZ

encoded_2026 = encode_date_xor_year("15.05.2026")
print(f"15.05.2026 encoded: {encoded_2026}") # Expected: (15^6=9 -> I), (5^6=3 -> AD), (26 -> BA) -> IAD BA

decoded_2025 = decode_date_xor_year(encoded_2025)
print(f"{encoded_2025} decoded (assuming year 2025): {decoded_2025}")

# Note: Decoding requires knowing the original year of encoding.
# The decode function currently assumes the current year for the XOR reversal.