#!/usr/bin/env python3
"""
Test script for OLED display
Run this to verify your display is working correctly
"""

import time
import sys

# Add current directory to path
sys.path.insert(0, '.')

from display import Display

def main():
    print("OLED Display Test")
    print("=" * 40)
    print()

    display = Display()

    if not display.device:
        print("ERROR: Display not initialized!")
        print("Check:")
        print("  1. I2C is enabled: sudo raspi-config")
        print("  2. Display is connected to GPIO 2 (SDA) and 3 (SCL)")
        print("  3. Check I2C address: sudo i2cdetect -y 1")
        return

    print("Display initialized successfully!")
    print()

    # Test sequence
    tests = [
        ("Startup screen", lambda: display.show_startup()),
        ("Tuning screen", lambda: display.show_tuning({
            "era": "1940s",
            "location": "N. AMERICA",
            "genre": "JAZZ"
        })),
        ("Playing screen", lambda: display.show_playing(
            track={
                "title": "A Very Long Track Title That Should Scroll",
                "creator": "The Jazz Ensemble",
                "date": "1945-03-15"
            },
            filters={"era": "1940s", "location": "N. AMERICA", "genre": "JAZZ"},
            volume=75,
            is_paused=False
        )),
        ("Paused screen", lambda: display.show_playing(
            track={
                "title": "Short Title",
                "creator": "Artist Name",
                "date": "1952"
            },
            filters={"era": "1950s", "location": "EUROPE", "genre": "BLUES"},
            volume=50,
            is_paused=True
        )),
        ("Idle screen", lambda: display.show_idle(
            filters={"era": "ALL ERAS", "location": "WORLD", "genre": "ALL GENRES"},
            volume=50
        )),
        ("Error screen", lambda: display.show_error("Network connection failed")),
        ("Off screen", lambda: display.show_off()),
    ]

    for name, test_func in tests:
        print(f"Testing: {name}")
        test_func()
        time.sleep(3)

    print()
    print("Test complete!")
    print("Display should have cycled through all screens.")

    # Final cleanup
    display.cleanup()


if __name__ == "__main__":
    main()
