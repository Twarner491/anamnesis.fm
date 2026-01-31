#!/usr/bin/env python3
"""
Test script for audio playback
Run this to verify audio output is working
"""

import time
import sys

sys.path.insert(0, '.')

from api import AnamnesisAPI
from audio import AudioPlayer

def main():
    print("Audio Playback Test")
    print("=" * 50)
    print()

    # Test 1: Check mpv availability
    print("[1/4] Checking mpv...")
    try:
        import mpv
        print("  mpv module available")
    except ImportError:
        print("  ERROR: python-mpv not installed!")
        print("  Install with: pip install python-mpv")
        return

    # Test 2: Initialize player
    print()
    print("[2/4] Initializing audio player...")

    track_ended = False
    error_msg = None

    def on_end():
        nonlocal track_ended
        track_ended = True
        print("  Track ended")

    def on_error(err):
        nonlocal error_msg
        error_msg = err
        print(f"  Error: {err}")

    try:
        player = AudioPlayer(on_track_end=on_end, on_error=on_error)
        if player.player:
            print("  Player initialized")
        else:
            print("  ERROR: Player failed to initialize")
            return
    except Exception as e:
        print(f"  ERROR: {e}")
        return

    # Test 3: Fetch a track
    print()
    print("[3/4] Fetching a test track...")
    api = AnamnesisAPI()

    items = api.search(era="1940-1949", genre="jazz")
    if not items:
        print("  ERROR: No tracks found")
        return

    print(f"  Found {len(items)} tracks")
    item = items[0]
    print(f"  Using: {item.get('title', item.get('identifier'))}")

    # Get metadata and stream URL
    meta = api.get_metadata(item['identifier'])
    if not meta or not meta.get('audioFiles'):
        print("  ERROR: No audio files in metadata")
        return

    audio_file = meta['audioFiles'][0]['name']
    stream_url = api.get_stream_url(item['identifier'], audio_file)
    print(f"  Title: {meta.get('title')}")
    print(f"  Stream URL ready")

    # Test 4: Play audio
    print()
    print("[4/4] Playing audio...")
    print("  You should hear audio from your speaker.")
    print("  Press Ctrl+C to stop.")
    print()

    player.set_volume(70)
    player.play(stream_url)

    try:
        # Play for 30 seconds or until ended/error
        for i in range(300):  # 30 seconds
            if track_ended or error_msg:
                break

            # Show playback position
            pos = player.get_position()
            dur = player.get_duration()
            if pos is not None and dur is not None:
                print(f"\r  Playing: {pos:.1f}s / {dur:.1f}s", end='', flush=True)
            else:
                print(f"\r  Playing... ({i/10:.0f}s)", end='', flush=True)

            time.sleep(0.1)

    except KeyboardInterrupt:
        print()
        print()
        print("Playback stopped.")

    finally:
        player.stop()
        player.cleanup()

    print()
    print()
    print("Test complete!")
    print()
    print("If you didn't hear audio:")
    print("  1. Check volume: alsamixer")
    print("  2. Test system audio: speaker-test -t wav -c 1")
    print("  3. Check PAM8403 power and wiring")
    print("  4. Verify audio jack connection")


if __name__ == "__main__":
    main()
