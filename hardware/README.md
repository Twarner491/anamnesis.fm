# Anamnesis.fm Physical Radio Build

Transform a vintage radio into a time-traveling internet radio powered by Raspberry Pi.

```
    ┌─────────────────────────────────────────────────────────┐
    │  ╔═══════════════════════════════════════════════════╗  │
    │  ║   A N A M N E S I S . F M                         ║  │
    │  ║   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║  │
    │  ║   1940s Jazz  •  North America  •  TUNING...      ║  │
    │  ╚═══════════════════════════════════════════════════╝  │
    │                                                         │
    │     (●)════════════════════════════════════════(●)      │
    │           VOLUME                       TUNE             │
    │                                                         │
    │   [1][2][3][4][5][6+]  [SOURCE][INFO][MENU]  [STANDBY] │
    │                                       [TIMER]           │
    └─────────────────────────────────────────────────────────┘
```

## Raspberry Pi Setup

| Setting | Value |
|---------|-------|
| Hostname | `radio` |
| Username | `pi` |
| Password | `raspberry` |
| SSH | `ssh pi@radio.local` |

## Bill of Materials

| Component | Description | Notes |
|-----------|-------------|-------|
| Raspberry Pi 2B | Main controller | 32-bit Lite OS |
| OLED Display | SSD1306 128x64 or 128x32 | I2C interface |
| MCP3008 | 8-channel 10-bit ADC | For reading potentiometers |
| PAM8403 | Class D audio amplifier | 3W per channel |
| Buck-Boost Converter | 5V regulated output | Powers Pi from radio's transformer |
| Volume Knob | Original radio pot | Connected to MCP3008 CH0 |
| Tune Knob | Original radio pot | Connected to MCP3008 CH1 |
| 11x Buttons | Original radio buttons | 1,2,3,4,5,6+,Source,Info,Menu,Standby,Timer |
| Vintage Radio | The enclosure | Speaker + aesthetic |

## Wiring Diagram

### Power Supply
```
Radio Transformer (AC) ──► Bridge Rectifier ──► Buck-Boost ──► 5V to Pi
                                                    │
                                                    └──► PAM8403 VCC
```

### GPIO Pin Assignments

```
Raspberry Pi 2B GPIO Header
┌─────────────────────────────────────┐
│  3V3  (1) (2)  5V                   │
│  SDA  (3) (4)  5V ──────► PAM8403   │
│  SCL  (5) (6)  GND ─────► Common GND│
│  GP4  (7) (8)  TX                   │
│  GND  (9) (10) RX                   │
│  GP17(11) (12) GP18 ────► PWM Audio │
│  GP27(13) (14) GND                  │
│  GP22(15) (16) GP23 ────► BTN_1     │
│  3V3 (17) (18) GP24 ────► BTN_2     │
│  MOSI(19) (20) GND                  │
│  MISO(21) (22) GP25 ────► BTN_3     │
│  SCLK(23) (24) CE0 ─────► MCP3008 CS│
│  GND (25) (26) CE1                  │
│  ID_SD(27)(28) ID_SC                │
│  GP5 (29) (30) GND                  │
│  GP6 (31) (32) GP12 ────► BTN_4     │
│  GP13(33) (34) GND                  │
│  GP19(35) (36) GP16 ────► BTN_5     │
│  GP26(37) (38) GP20 ────► BTN_6PLUS │
│  GND (39) (40) GP21 ────► BTN_SOURCE│
└─────────────────────────────────────┘

Additional buttons:
  GP4  (pin 7)  ────► BTN_INFO
  GP17 (pin 11) ────► BTN_MENU
  GP27 (pin 13) ────► BTN_STANDBY
  GP22 (pin 15) ────► BTN_TIMER
```

### OLED Display (I2C)
```
OLED          Raspberry Pi
─────         ────────────
VCC    ────►  3.3V (pin 1)
GND    ────►  GND (pin 6)
SDA    ────►  GPIO2/SDA (pin 3)
SCL    ────►  GPIO3/SCL (pin 5)
```

### MCP3008 ADC (SPI)
```
MCP3008       Raspberry Pi
───────       ────────────
VDD    ────►  3.3V (pin 1)
VREF   ────►  3.3V (pin 1)
AGND   ────►  GND (pin 6)
CLK    ────►  SCLK (pin 23)
DOUT   ────►  MISO (pin 21)
DIN    ────►  MOSI (pin 19)
CS     ────►  CE0 (pin 24)
DGND   ────►  GND (pin 6)

CH0    ────►  Volume Pot (wiper)
CH1    ────►  Tuning Pot (wiper)
```

### Potentiometers
```
        3.3V
          │
          ┌┴┐
          │ │ 10K
          │ │ Potentiometer
          └┬┘
          ─┼─────► MCP3008 CH0/CH1 (wiper)
          ┌┴┐
          │ │
          └┬┘
          │
         GND
```

### PAM8403 Audio Amplifier
```
PAM8403         Connections
───────         ───────────
VCC      ────►  5V (pin 2 or 4)
GND      ────►  GND (pin 6)
L-IN     ────►  GPIO18 (PWM) via 1K resistor + 10uF cap
R-IN     ────►  GPIO18 (PWM) via 1K resistor + 10uF cap (mono)
L+/L-    ────►  Speaker +/-
R+/R-    ────►  (unused for mono, or second speaker)
```

### Audio Filter (Recommended)
```
GPIO18 ──[1K]──┬──[10uF]──► PAM8403 Input
               │
             [10K]
               │
              GND
```

### Button Wiring
```
All buttons connect between GPIO and GND.
Internal pull-ups are enabled in software.

GPIO23 ──[BTN]── GND    (1)        - Era cycle
GPIO24 ──[BTN]── GND    (2)        - Location cycle
GPIO25 ──[BTN]── GND    (3)        - Genre cycle
GPIO12 ──[BTN]── GND    (4)        - Previous track
GPIO16 ──[BTN]── GND    (5)        - Next track
GPIO20 ──[BTN]── GND    (6+)       - Skip forward
GPIO21 ──[BTN]── GND    (SOURCE)   - Play/Pause
GPIO4  ──[BTN]── GND    (INFO)     - Show track info
GPIO17 ──[BTN]── GND    (MENU)     - Cycle display mode
GPIO27 ──[BTN]── GND    (STANDBY)  - Power on/off
GPIO22 ──[BTN]── GND    (TIMER)    - Stop playback
```

## Complete Wiring Schematic

```
                                    ┌─────────────────┐
                                    │  OLED Display   │
                                    │  ┌───────────┐  │
                                    │  │ ANAMNESIS │  │
                                    │  │  1940s    │  │
                                    │  └───────────┘  │
                                    └──┬──┬──┬──┬────┘
                                       │  │  │  │
                    3.3V───────────────┘  │  │  │
                    GND────────────────────┘  │  │
        ┌──────────SDA────────────────────────┘  │
        │    ┌─────SCL───────────────────────────┘
        │    │
┌───────┴────┴─────────────────────────────────────────┐
│   ┌─────────────────────────────────────────────┐    │
│   │              RASPBERRY PI 2B                │    │
│   │                                             │    │
│   │  GPIO18 (PWM) ──────────────────────────────┼────┼──► Audio Out
│   │                                             │    │
│   │  GPIO23-26, 4, 12, 16, 20, 21 ◄─────────────┼────┼─── Buttons
│   │                                             │    │
│   │  SPI (MOSI, MISO, SCLK, CE0) ◄──────────────┼────┼─── MCP3008
│   │                                             │    │
│   │  5V ────────────────────────────────────────┼────┼──► PAM8403
│   │  GND ───────────────────────────────────────┼────┼──► Common
│   └─────────────────────────────────────────────┘    │
│                        │                             │
│                   Buck-Boost                         │
│                   Converter                          │
│                        │                             │
└────────────────────────┴─────────────────────────────┘
                         │
                  Radio Transformer
```

## Software Setup

### 1. Flash Raspberry Pi OS Lite (32-bit)

Use Raspberry Pi Imager to flash the SD card:
- Choose "Raspberry Pi OS Lite (32-bit)"
- Configure WiFi and enable SSH in settings
- Set hostname to `radio`
- Set username to `pi`, password to `raspberry`

### 2. Clone and Install

SSH into your Pi and run:

```bash
# Connect to the Pi
ssh pi@radio.local
# Password: raspberry

# Clone the repository
git clone https://github.com/teddywarner/timetravlingRadio.git
cd timetravlingRadio/hardware

# Run the setup script
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3-pip python3-venv python3-dev \
    libopenjp2-7 libtiff5 libatlas-base-dev \
    mpv pulseaudio

# Enable interfaces
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_spi 0

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Install and enable service
sudo cp anamnesis-radio.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable anamnesis-radio
sudo systemctl start anamnesis-radio
```

### 3. Configure Audio

```bash
# Set audio output to PWM (headphone jack)
sudo raspi-config nonint do_audio 1

# Test audio
speaker-test -t wav -c 1
```

### 4. Test Individual Components

```bash
# Activate virtual environment
source venv/bin/activate

# Test OLED display
python3 test_oled.py

# Test buttons
python3 test_buttons.py

# Test potentiometers
python3 test_pots.py

# Test audio playback
python3 test_audio.py
```

## Usage

Once running, the physical radio works like this:

| Button | Function |
|--------|----------|
| **STANDBY** | Power on/off |
| **SOURCE** | Play/Pause toggle |
| **TIMER** | Stop playback |
| **1** | Cycle through eras (1920s → 2020s) |
| **2** | Cycle through locations (World → N.America → Europe...) |
| **3** | Cycle through genres (Jazz → Blues → Rock...) |
| **4** | Previous track |
| **5** | Next track |
| **6+** | Skip forward 30 seconds |
| **INFO** | Toggle extended track info display |
| **MENU** | Cycle display modes |

| Knob | Function |
|------|----------|
| **VOLUME** | Adjust volume (0-100%) |
| **TUNE** | Fine-tune within current filters |

### OLED Display Shows:
- Current track title (scrolling)
- Artist/creator
- Year and location
- Current filter settings
- Playback status