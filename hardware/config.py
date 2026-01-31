"""
Configuration for Anamnesis.fm Physical Radio
"""

# API Configuration
API_BASE_URL = "https://anamnesis-api.teddy-557.workers.dev"

# GPIO Pin Assignments (BCM numbering)
class Pins:
    # Original radio buttons (directly connected GPIO -> GND)
    # Numeric buttons - filter controls
    BTN_1 = 23          # Era cycle
    BTN_2 = 24          # Location cycle
    BTN_3 = 25          # Genre cycle
    BTN_4 = 12          # Previous track
    BTN_5 = 16          # Next track
    BTN_6_PLUS = 20     # Skip forward

    # Function buttons
    BTN_SOURCE = 21     # Play/Pause
    BTN_INFO = 4        # Show track info
    BTN_MENU = 17       # Cycle display mode
    BTN_STANDBY = 27    # Power on/off
    BTN_TIMER = 22      # Stop playback

    # Aliases for code readability
    BTN_POWER = BTN_STANDBY
    BTN_PLAY = BTN_SOURCE
    BTN_STOP = BTN_TIMER
    BTN_PREV = BTN_4
    BTN_NEXT = BTN_5
    BTN_ERA = BTN_1
    BTN_LOCATION = BTN_2
    BTN_GENRE = BTN_3
    BTN_SKIP = BTN_6_PLUS

    # Audio PWM output
    AUDIO_PWM = 18

    # SPI for MCP3008 (directly connected, but track which CE we use)
    MCP3008_CE = 0  # CE0 = GPIO8

    # I2C for OLED (hardware I2C, pins 2 and 3)
    # SDA = 2, SCL = 3 (fixed by hardware)

# MCP3008 ADC Channels
class ADC:
    VOLUME = 0      # Channel 0
    TUNING = 1      # Channel 1

# OLED Display Configuration
class Display:
    WIDTH = 128
    HEIGHT = 64     # Use 32 for smaller displays
    I2C_ADDRESS = 0x3C  # Common: 0x3C or 0x3D
    ROTATION = 0    # 0, 1, 2, or 3 (90 degree increments)

# Filter Options (matching web app)
ERAS = [
    {"id": "all", "label": "ALL ERAS", "query": None},
    {"id": "1920s", "label": "1920s", "query": "1920-1929"},
    {"id": "1930s", "label": "1930s", "query": "1930-1939"},
    {"id": "1940s", "label": "1940s", "query": "1940-1949"},
    {"id": "1950s", "label": "1950s", "query": "1950-1959"},
    {"id": "1960s", "label": "1960s", "query": "1960-1969"},
    {"id": "1970s", "label": "1970s", "query": "1970-1979"},
    {"id": "1980s", "label": "1980s", "query": "1980-1989"},
    {"id": "1990s", "label": "1990s", "query": "1990-1999"},
    {"id": "2000s", "label": "2000s", "query": "2000-2009"},
    {"id": "2010s", "label": "2010s", "query": "2010-2019"},
    {"id": "2020s", "label": "2020s", "query": "2020-2029"},
]

LOCATIONS = [
    {"id": "all", "label": "WORLD", "query": None},
    {"id": "north-america", "label": "N. AMERICA", "query": "North America"},
    {"id": "south-america", "label": "S. AMERICA", "query": "South America"},
    {"id": "europe", "label": "EUROPE", "query": "Europe"},
    {"id": "asia", "label": "ASIA", "query": "Asia"},
    {"id": "middle-east", "label": "MIDDLE EAST", "query": "Middle East"},
    {"id": "africa", "label": "AFRICA", "query": "Africa"},
    {"id": "antarctica", "label": "ANTARCTICA", "query": "Antarctica"},  # Easter egg!
]

GENRES = [
    {"id": "all", "label": "ALL GENRES", "query": None},
    {"id": "jazz", "label": "JAZZ", "query": "jazz"},
    {"id": "blues", "label": "BLUES", "query": "blues"},
    {"id": "rock", "label": "ROCK", "query": "rock"},
    {"id": "hip-hop", "label": "HIP-HOP", "query": "hip-hop"},
    {"id": "soul", "label": "SOUL/R&B", "query": "soul"},
    {"id": "classical", "label": "CLASSICAL", "query": "classical"},
    {"id": "country", "label": "COUNTRY", "query": "country"},
    {"id": "folk", "label": "FOLK", "query": "folk"},
    {"id": "electronic", "label": "ELECTRONIC", "query": "electronic"},
    {"id": "comedy", "label": "COMEDY", "query": "comedy"},
    {"id": "news", "label": "NEWS/TALK", "query": "news"},
]

# Timing Configuration
class Timing:
    BUTTON_DEBOUNCE_MS = 200       # Button debounce time
    POT_SAMPLE_INTERVAL_MS = 100   # How often to read pots
    POT_CHANGE_THRESHOLD = 10     # ADC units change to register
    DISPLAY_SCROLL_SPEED_MS = 150  # Text scroll speed
    API_TIMEOUT_S = 10             # API request timeout
    RETUNE_DEBOUNCE_MS = 500       # Debounce filter changes

# Volume Configuration
class Volume:
    MIN = 0
    MAX = 100
    DEFAULT = 50
