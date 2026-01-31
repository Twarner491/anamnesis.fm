"""
Hardware Controls for Anamnesis.fm Radio
Handles buttons (GPIO) and potentiometers (MCP3008 ADC)
"""

import threading
import time
from typing import Callable, Optional

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False
    print("Warning: RPi.GPIO not available, controls disabled")

try:
    import spidev
    SPI_AVAILABLE = True
except ImportError:
    SPI_AVAILABLE = False
    print("Warning: spidev not available, ADC disabled")

from config import Pins, ADC, Timing


class Controls:
    """Hardware controls manager - buttons and potentiometers"""

    def __init__(
        self,
        on_power: Callable,          # STANDBY button
        on_play: Callable,           # SOURCE button (play/pause)
        on_stop: Callable,           # TIMER button
        on_prev: Callable,           # Button 4
        on_next: Callable,           # Button 5
        on_skip: Callable,           # Button 6+
        on_era: Callable,            # Button 1
        on_location: Callable,       # Button 2
        on_genre: Callable,          # Button 3
        on_info: Callable,           # INFO button
        on_menu: Callable,           # MENU button
        on_volume_change: Callable[[int], None],
        on_tuning_change: Callable[[int], None],
    ):
        # Store callbacks for all 11 buttons
        self.on_power = on_power
        self.on_play = on_play
        self.on_stop = on_stop
        self.on_prev = on_prev
        self.on_next = on_next
        self.on_skip = on_skip
        self.on_era = on_era
        self.on_location = on_location
        self.on_genre = on_genre
        self.on_info = on_info
        self.on_menu = on_menu
        self.on_volume_change = on_volume_change
        self.on_tuning_change = on_tuning_change

        # Button debounce tracking
        self._last_button_time = {}

        # Potentiometer tracking
        self._last_volume = 0
        self._last_tuning = 0

        # SPI for ADC
        self.spi = None

        # Polling thread
        self._polling = False
        self._poll_thread: Optional[threading.Thread] = None

        # Initialize hardware
        self._setup_gpio()
        self._setup_spi()
        self._start_polling()

    def _setup_gpio(self):
        """Initialize GPIO for buttons"""
        if not GPIO_AVAILABLE:
            return

        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)

        # All 11 button pins with pull-up resistors
        # Using the original button names from the radio
        button_pins = [
            Pins.BTN_1,         # Era cycle
            Pins.BTN_2,         # Location cycle
            Pins.BTN_3,         # Genre cycle
            Pins.BTN_4,         # Previous
            Pins.BTN_5,         # Next
            Pins.BTN_6_PLUS,    # Skip forward
            Pins.BTN_SOURCE,    # Play/Pause
            Pins.BTN_INFO,      # Show info
            Pins.BTN_MENU,      # Menu
            Pins.BTN_STANDBY,   # Power
            Pins.BTN_TIMER,     # Stop
        ]

        for pin in button_pins:
            GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            self._last_button_time[pin] = 0

        # Add event detection for all 11 buttons
        # Numeric buttons (1-6+)
        GPIO.add_event_detect(Pins.BTN_1, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_era),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_2, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_location),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_3, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_genre),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_4, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_prev),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_5, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_next),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_6_PLUS, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_skip),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)

        # Function buttons
        GPIO.add_event_detect(Pins.BTN_SOURCE, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_play),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_INFO, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_info),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_MENU, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_menu),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_STANDBY, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_power),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)
        GPIO.add_event_detect(Pins.BTN_TIMER, GPIO.FALLING,
                              callback=lambda p: self._button_callback(p, self.on_stop),
                              bouncetime=Timing.BUTTON_DEBOUNCE_MS)

        print("GPIO buttons initialized (11 buttons)")

    def _setup_spi(self):
        """Initialize SPI for MCP3008 ADC"""
        if not SPI_AVAILABLE:
            return

        try:
            self.spi = spidev.SpiDev()
            self.spi.open(0, Pins.MCP3008_CE)  # Bus 0, CE0
            self.spi.max_speed_hz = 1000000  # 1MHz
            self.spi.mode = 0
            print("SPI ADC initialized")
        except Exception as e:
            print(f"Failed to initialize SPI: {e}")
            self.spi = None

    def _button_callback(self, pin: int, callback: Callable):
        """Handle button press with debouncing"""
        current_time = time.time() * 1000

        # Extra debounce check
        if current_time - self._last_button_time.get(pin, 0) < Timing.BUTTON_DEBOUNCE_MS:
            return

        self._last_button_time[pin] = current_time

        # Call the callback
        try:
            callback()
        except Exception as e:
            print(f"Button callback error: {e}")

    def _read_adc(self, channel: int) -> int:
        """Read value from MCP3008 ADC channel (0-7)"""
        if not self.spi:
            return 0

        try:
            # MCP3008 SPI protocol
            # Send: start bit (1), single-ended (1), channel (3 bits), don't care (4 bits)
            # Receive: null bit, 10-bit data
            cmd = [1, (8 + channel) << 4, 0]
            result = self.spi.xfer2(cmd)

            # Combine result bytes into 10-bit value
            value = ((result[1] & 3) << 8) + result[2]
            return value

        except Exception as e:
            print(f"ADC read error: {e}")
            return 0

    def _start_polling(self):
        """Start background polling for potentiometers"""
        self._polling = True

        def poll_loop():
            while self._polling:
                self._poll_potentiometers()
                time.sleep(Timing.POT_SAMPLE_INTERVAL_MS / 1000)

        self._poll_thread = threading.Thread(target=poll_loop, daemon=True)
        self._poll_thread.start()

    def _poll_potentiometers(self):
        """Read and process potentiometer values"""
        if not self.spi:
            return

        # Read volume pot
        volume = self._read_adc(ADC.VOLUME)
        if abs(volume - self._last_volume) > Timing.POT_CHANGE_THRESHOLD:
            self._last_volume = volume
            try:
                self.on_volume_change(volume)
            except Exception as e:
                print(f"Volume callback error: {e}")

        # Read tuning pot
        tuning = self._read_adc(ADC.TUNING)
        if abs(tuning - self._last_tuning) > Timing.POT_CHANGE_THRESHOLD:
            self._last_tuning = tuning
            try:
                self.on_tuning_change(tuning)
            except Exception as e:
                print(f"Tuning callback error: {e}")

    def get_volume(self) -> int:
        """Get current volume pot value (0-1023)"""
        return self._last_volume

    def get_tuning(self) -> int:
        """Get current tuning pot value (0-1023)"""
        return self._last_tuning

    def cleanup(self):
        """Clean up hardware resources"""
        self._polling = False

        if self._poll_thread:
            self._poll_thread.join(timeout=1)

        if self.spi:
            self.spi.close()

        if GPIO_AVAILABLE:
            GPIO.cleanup()

        print("Controls cleaned up")


class MockControls(Controls):
    """Mock controls for testing without hardware"""

    def __init__(self, **kwargs):
        # Store callbacks without initializing hardware
        self.on_power = kwargs.get('on_power', lambda: None)
        self.on_play = kwargs.get('on_play', lambda: None)
        self.on_stop = kwargs.get('on_stop', lambda: None)
        self.on_prev = kwargs.get('on_prev', lambda: None)
        self.on_next = kwargs.get('on_next', lambda: None)
        self.on_skip = kwargs.get('on_skip', lambda: None)
        self.on_era = kwargs.get('on_era', lambda: None)
        self.on_location = kwargs.get('on_location', lambda: None)
        self.on_genre = kwargs.get('on_genre', lambda: None)
        self.on_info = kwargs.get('on_info', lambda: None)
        self.on_menu = kwargs.get('on_menu', lambda: None)
        self.on_volume_change = kwargs.get('on_volume_change', lambda v: None)
        self.on_tuning_change = kwargs.get('on_tuning_change', lambda v: None)

        self._last_volume = 512  # Mid-point
        self._last_tuning = 512

        print("Mock controls initialized (no hardware)")

    def simulate_button(self, button: str):
        """Simulate a button press for testing"""
        callbacks = {
            'power': self.on_power,
            'standby': self.on_power,
            'play': self.on_play,
            'source': self.on_play,
            'stop': self.on_stop,
            'timer': self.on_stop,
            'prev': self.on_prev,
            '4': self.on_prev,
            'next': self.on_next,
            '5': self.on_next,
            'skip': self.on_skip,
            '6+': self.on_skip,
            'era': self.on_era,
            '1': self.on_era,
            'location': self.on_location,
            '2': self.on_location,
            'genre': self.on_genre,
            '3': self.on_genre,
            'info': self.on_info,
            'menu': self.on_menu,
        }
        if button.lower() in callbacks:
            callbacks[button.lower()]()

    def simulate_volume(self, value: int):
        """Simulate volume pot change"""
        self._last_volume = value
        self.on_volume_change(value)

    def simulate_tuning(self, value: int):
        """Simulate tuning pot change"""
        self._last_tuning = value
        self.on_tuning_change(value)

    def cleanup(self):
        """No-op for mock"""
        pass
