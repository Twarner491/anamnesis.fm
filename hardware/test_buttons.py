#!/usr/bin/env python3
"""
Test script for buttons
Run this to verify your button wiring
"""

import time
import sys

sys.path.insert(0, '.')

from config import Pins

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False

def main():
    print("Button Test")
    print("=" * 40)
    print()

    if not GPIO_AVAILABLE:
        print("ERROR: RPi.GPIO not available!")
        print("This test must run on a Raspberry Pi")
        return

    # Button pin mapping - all 11 original radio buttons
    buttons = {
        Pins.BTN_1: "1 (Era)",
        Pins.BTN_2: "2 (Location)",
        Pins.BTN_3: "3 (Genre)",
        Pins.BTN_4: "4 (Previous)",
        Pins.BTN_5: "5 (Next)",
        Pins.BTN_6_PLUS: "6+ (Skip)",
        Pins.BTN_SOURCE: "SOURCE (Play/Pause)",
        Pins.BTN_INFO: "INFO",
        Pins.BTN_MENU: "MENU",
        Pins.BTN_STANDBY: "STANDBY (Power)",
        Pins.BTN_TIMER: "TIMER (Stop)",
    }

    print("Button GPIO Pin Assignments:")
    print("-" * 40)
    for pin, name in buttons.items():
        print(f"  GPIO{pin:2d} -> {name}")
    print()

    # Setup GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)

    for pin in buttons.keys():
        GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    print("Press each button to test.")
    print("Press Ctrl+C to exit.")
    print()
    print("Waiting for button presses...")
    print("-" * 40)

    # Track which buttons have been tested
    tested = set()

    def button_callback(pin):
        name = buttons.get(pin, f"Unknown (GPIO{pin})")
        print(f"  Pressed: {name} (GPIO{pin})")
        tested.add(pin)

    # Add event detection for all buttons
    for pin in buttons.keys():
        GPIO.add_event_detect(pin, GPIO.FALLING, callback=button_callback, bouncetime=200)

    try:
        while True:
            # Show progress
            remaining = len(buttons) - len(tested)
            if remaining == 0:
                print()
                print("All buttons tested successfully!")
                break
            time.sleep(0.1)

    except KeyboardInterrupt:
        print()
        print()
        print("Test interrupted.")

        if tested:
            print(f"Tested {len(tested)}/{len(buttons)} buttons:")
            for pin in tested:
                print(f"  OK: {buttons[pin]}")

        untested = set(buttons.keys()) - tested
        if untested:
            print(f"Not tested ({len(untested)}):")
            for pin in untested:
                print(f"  MISSING: {buttons[pin]} (GPIO{pin})")

    finally:
        GPIO.cleanup()


if __name__ == "__main__":
    main()
