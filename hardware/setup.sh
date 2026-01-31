#!/bin/bash
#
# Anamnesis.fm Physical Radio - Setup Script
# Run this on your Raspberry Pi to install everything
#

set -e

echo "==========================================="
echo "  Anamnesis.fm Radio Setup"
echo "==========================================="
echo ""

# Check if running as root for system packages
if [ "$EUID" -eq 0 ]; then
    echo "Please run without sudo. Script will ask for sudo when needed."
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "[1/7] Updating system packages..."
sudo apt update
sudo apt upgrade -y

echo ""
echo "[2/7] Installing system dependencies..."
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    python3-pil \
    libopenjp2-7 \
    libtiff5 \
    libatlas-base-dev \
    mpv \
    libmpv-dev \
    i2c-tools \
    git

echo ""
echo "[3/7] Enabling I2C and SPI interfaces..."
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_spi 0

# Add user to required groups
sudo usermod -aG gpio,i2c,spi $USER

echo ""
echo "[4/7] Configuring audio output..."
# Set audio to headphone jack (for PWM audio)
sudo raspi-config nonint do_audio 1

# Enable PWM audio overlay if not already enabled
if ! grep -q "dtoverlay=pwm-2chan" /boot/config.txt; then
    echo "dtoverlay=pwm-2chan,pin=18,func=2,pin2=13,func2=4" | sudo tee -a /boot/config.txt
fi

echo ""
echo "[5/7] Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo ""
echo "[6/7] Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "[7/7] Installing systemd service..."
# Update service file with correct paths
sed "s|/home/pi/timetravlingRadio|$SCRIPT_DIR/..|g" anamnesis-radio.service > /tmp/anamnesis-radio.service
sudo cp /tmp/anamnesis-radio.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable anamnesis-radio

echo ""
echo "==========================================="
echo "  Setup Complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Wire up your hardware according to README.md"
echo ""
echo "2. Test individual components:"
echo "   source venv/bin/activate"
echo "   python3 test_oled.py"
echo "   python3 test_buttons.py"
echo "   python3 test_pots.py"
echo "   python3 test_audio.py"
echo ""
echo "3. Start the radio manually:"
echo "   python3 radio.py"
echo ""
echo "4. Or start the service:"
echo "   sudo systemctl start anamnesis-radio"
echo "   sudo systemctl status anamnesis-radio"
echo ""
echo "5. View logs:"
echo "   journalctl -u anamnesis-radio -f"
echo ""
echo "A reboot is recommended to apply all changes."
echo "Reboot now? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    sudo reboot
fi
