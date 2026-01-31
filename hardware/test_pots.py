#!/usr/bin/env python3
"""
Test script for potentiometers via MCP3008 ADC
Run this to verify your potentiometer wiring
"""

import time
import sys

sys.path.insert(0, '.')

from config import ADC, Pins

try:
    import spidev
    SPI_AVAILABLE = True
except ImportError:
    SPI_AVAILABLE = False

def read_adc(spi, channel):
    """Read value from MCP3008 ADC channel"""
    cmd = [1, (8 + channel) << 4, 0]
    result = spi.xfer2(cmd)
    value = ((result[1] & 3) << 8) + result[2]
    return value

def draw_bar(value, max_val=1023, width=40):
    """Draw an ASCII progress bar"""
    filled = int((value / max_val) * width)
    return '█' * filled + '░' * (width - filled)

def main():
    print("Potentiometer Test (MCP3008 ADC)")
    print("=" * 50)
    print()

    if not SPI_AVAILABLE:
        print("ERROR: spidev not available!")
        print("Install with: pip install spidev")
        return

    # Setup SPI
    try:
        spi = spidev.SpiDev()
        spi.open(0, Pins.MCP3008_CE)
        spi.max_speed_hz = 1000000
        spi.mode = 0
        print("SPI initialized successfully!")
    except Exception as e:
        print(f"ERROR: Failed to initialize SPI: {e}")
        print()
        print("Check:")
        print("  1. SPI is enabled: sudo raspi-config")
        print("  2. MCP3008 is wired correctly")
        print("  3. CS is connected to CE0 (GPIO8)")
        return

    print()
    print(f"Reading ADC channels:")
    print(f"  Channel {ADC.VOLUME} = Volume potentiometer")
    print(f"  Channel {ADC.TUNING} = Tuning potentiometer")
    print()
    print("Turn the potentiometers to see values change.")
    print("Press Ctrl+C to exit.")
    print()
    print("-" * 50)

    try:
        while True:
            # Read both channels
            volume = read_adc(spi, ADC.VOLUME)
            tuning = read_adc(spi, ADC.TUNING)

            # Calculate percentages
            vol_pct = int((volume / 1023) * 100)
            tune_pct = int((tuning / 1023) * 100)

            # Display with bars
            print(f"\rVolume: {draw_bar(volume)} {volume:4d} ({vol_pct:3d}%)  "
                  f"Tuning: {draw_bar(tuning)} {tuning:4d} ({tune_pct:3d}%)", end='', flush=True)

            time.sleep(0.1)

    except KeyboardInterrupt:
        print()
        print()
        print("Test complete!")
        print()
        print("If values don't change when turning pots:")
        print("  1. Check pot wiring (3.3V -> pot -> wiper -> GND)")
        print("  2. Verify MCP3008 connections")
        print("  3. Try different ADC channels")

    finally:
        spi.close()


if __name__ == "__main__":
    main()
