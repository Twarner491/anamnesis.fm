"""
OLED Display Driver for Anamnesis.fm Radio
Handles SSD1306 display via I2C
"""

import threading
import time
from typing import Optional

try:
    from luma.core.interface.serial import i2c
    from luma.oled.device import ssd1306
    from luma.core.render import canvas
    from PIL import ImageFont, Image, ImageDraw
    DISPLAY_AVAILABLE = True
except ImportError:
    DISPLAY_AVAILABLE = False
    print("Warning: luma.oled not available, display disabled")

from config import Display as DisplayConfig, Timing


class Display:
    """OLED display controller"""

    def __init__(self):
        self.device = None
        self.width = DisplayConfig.WIDTH
        self.height = DisplayConfig.HEIGHT

        # Scrolling text state
        self._scroll_offset = 0
        self._scroll_text = ""
        self._scroll_thread: Optional[threading.Thread] = None
        self._scroll_running = False

        # Try to initialize display
        if DISPLAY_AVAILABLE:
            try:
                serial = i2c(port=1, address=DisplayConfig.I2C_ADDRESS)
                self.device = ssd1306(
                    serial,
                    width=self.width,
                    height=self.height,
                    rotate=DisplayConfig.ROTATION,
                )
                print(f"OLED display initialized ({self.width}x{self.height})")
            except Exception as e:
                print(f"Failed to initialize display: {e}")
                self.device = None

        # Load fonts
        self._load_fonts()

    def _load_fonts(self):
        """Load fonts for display"""
        try:
            # Try to load a nice pixel font, fall back to default
            self.font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 12)
            self.font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 10)
            self.font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 8)
        except:
            # Fall back to default PIL font
            self.font_large = ImageFont.load_default()
            self.font_medium = ImageFont.load_default()
            self.font_small = ImageFont.load_default()

    def _draw(self, draw_func):
        """Helper to draw on display"""
        if not self.device:
            return

        with canvas(self.device) as draw:
            draw_func(draw)

    def show_off(self):
        """Show powered off state (blank or subtle)"""
        self._stop_scroll()

        if not self.device:
            return

        # Just clear the display
        self.device.clear()

    def show_startup(self):
        """Show startup animation"""
        self._stop_scroll()

        def draw(draw):
            # Draw startup logo
            draw.rectangle([0, 0, self.width-1, self.height-1], outline="white")

            # Title
            title = "ANAMNESIS.FM"
            draw.text((self.width//2, 20), title, font=self.font_large, fill="white", anchor="mm")

            # Subtitle
            subtitle = "Time Traveling Radio"
            draw.text((self.width//2, 40), subtitle, font=self.font_small, fill="white", anchor="mm")

        self._draw(draw)

    def show_tuning(self, filters: dict):
        """Show tuning/loading state with static animation"""
        self._stop_scroll()

        def draw(draw):
            # Header
            draw.text((2, 2), "ANAMNESIS.FM", font=self.font_small, fill="white")

            # Tuning indicator with animated static
            static_chars = "░▒▓█▓▒░"
            static_line = "".join([static_chars[hash(str(time.time()) + str(i)) % len(static_chars)]
                                   for i in range(16)])
            draw.text((self.width//2, 25), static_line, font=self.font_medium, fill="white", anchor="mm")

            # TUNING text
            draw.text((self.width//2, 38), "TUNING...", font=self.font_large, fill="white", anchor="mm")

            # Current filters at bottom
            filter_text = f"{filters['era']} | {filters['location']}"
            draw.text((self.width//2, 55), filter_text, font=self.font_small, fill="white", anchor="mm")

        self._draw(draw)

        # Schedule refresh for animation
        if self.device:
            threading.Timer(0.1, lambda: self.show_tuning(filters) if self._scroll_running == False else None).start()

    def show_playing(self, track: dict, filters: dict, volume: int, is_paused: bool = False):
        """Show now playing screen"""
        title = track.get("title", "Unknown Track")
        creator = track.get("creator", "Unknown Artist")
        date = track.get("date", "")
        year = date[:4] if date else ""

        # Start scrolling if title is long
        if len(title) > 18:
            self._start_scroll(title)
            display_title = self._get_scroll_text(18)
        else:
            self._stop_scroll()
            display_title = title

        def draw(draw):
            # Status bar at top
            status = "PAUSED" if is_paused else "PLAYING"
            draw.text((2, 2), status, font=self.font_small, fill="white")

            # Volume indicator
            vol_text = f"VOL:{volume:02d}"
            draw.text((self.width - 2, 2), vol_text, font=self.font_small, fill="white", anchor="ra")

            # Divider line
            draw.line([(0, 12), (self.width, 12)], fill="white")

            # Track title (scrolling)
            draw.text((2, 16), display_title, font=self.font_large, fill="white")

            # Artist/creator
            if len(creator) > 20:
                creator_display = creator[:17] + "..."
            else:
                creator_display = creator
            draw.text((2, 30), creator_display, font=self.font_medium, fill="white")

            # Year
            if year:
                draw.text((2, 42), year, font=self.font_medium, fill="white")

            # Divider line
            draw.line([(0, 52), (self.width, 52)], fill="white")

            # Filter info at bottom
            filter_text = f"{filters['era'][:4]} | {filters['location'][:6]} | {filters['genre'][:5]}"
            draw.text((self.width//2, 58), filter_text, font=self.font_small, fill="white", anchor="mm")

        self._draw(draw)

    def show_idle(self, filters: dict, volume: int):
        """Show idle state (ready but not playing)"""
        self._stop_scroll()

        def draw(draw):
            # Header
            draw.text((2, 2), "ANAMNESIS.FM", font=self.font_small, fill="white")

            # Volume
            vol_text = f"VOL:{volume:02d}"
            draw.text((self.width - 2, 2), vol_text, font=self.font_small, fill="white", anchor="ra")

            # Divider
            draw.line([(0, 12), (self.width, 12)], fill="white")

            # Ready message
            draw.text((self.width//2, 28), "READY", font=self.font_large, fill="white", anchor="mm")
            draw.text((self.width//2, 42), "Press PLAY", font=self.font_small, fill="white", anchor="mm")

            # Divider
            draw.line([(0, 52), (self.width, 52)], fill="white")

            # Filters
            filter_text = f"{filters['era'][:4]} | {filters['location'][:6]} | {filters['genre'][:5]}"
            draw.text((self.width//2, 58), filter_text, font=self.font_small, fill="white", anchor="mm")

        self._draw(draw)

    def show_error(self, message: str):
        """Show error message"""
        self._stop_scroll()

        def draw(draw):
            draw.text((self.width//2, 20), "ERROR", font=self.font_large, fill="white", anchor="mm")
            # Wrap message if needed
            if len(message) > 20:
                lines = [message[i:i+20] for i in range(0, len(message), 20)]
                y = 35
                for line in lines[:2]:  # Max 2 lines
                    draw.text((self.width//2, y), line, font=self.font_small, fill="white", anchor="mm")
                    y += 10
            else:
                draw.text((self.width//2, 40), message, font=self.font_small, fill="white", anchor="mm")

        self._draw(draw)

    # === Scrolling Text ===

    def _start_scroll(self, text: str):
        """Start scrolling text"""
        if self._scroll_text == text and self._scroll_running:
            return  # Already scrolling this text

        self._stop_scroll()
        self._scroll_text = text + "    "  # Add padding
        self._scroll_offset = 0
        self._scroll_running = True

        def scroll_loop():
            while self._scroll_running:
                time.sleep(Timing.DISPLAY_SCROLL_SPEED_MS / 1000)
                self._scroll_offset = (self._scroll_offset + 1) % len(self._scroll_text)

        self._scroll_thread = threading.Thread(target=scroll_loop, daemon=True)
        self._scroll_thread.start()

    def _stop_scroll(self):
        """Stop scrolling text"""
        self._scroll_running = False
        if self._scroll_thread:
            self._scroll_thread = None
        self._scroll_offset = 0
        self._scroll_text = ""

    def _get_scroll_text(self, max_len: int) -> str:
        """Get current visible portion of scrolling text"""
        if not self._scroll_text:
            return ""

        # Create a circular view of the text
        doubled = self._scroll_text * 2
        start = self._scroll_offset % len(self._scroll_text)
        return doubled[start:start + max_len]

    # === Cleanup ===

    def cleanup(self):
        """Clean up display resources"""
        self._stop_scroll()
        if self.device:
            self.device.clear()
