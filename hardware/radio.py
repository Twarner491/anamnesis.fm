#!/usr/bin/env python3
"""
Anamnesis.fm Physical Radio Controller
Main entry point for the Raspberry Pi radio
"""

import time
import signal
import sys
import threading
from typing import Optional

from config import ERAS, LOCATIONS, GENRES, Timing, Volume
from display import Display
from controls import Controls
from audio import AudioPlayer
from api import AnamnesisAPI


class Radio:
    """Main radio controller that coordinates all components"""

    def __init__(self):
        print("Initializing Anamnesis.fm Radio...")

        # State
        self.powered_on = False
        self.is_playing = False
        self.is_loading = False

        # Current filter indices
        self.era_index = 0
        self.location_index = 0
        self.genre_index = 0

        # Current track info
        self.current_track: Optional[dict] = None
        self.queue: list = []

        # Volume (0-100)
        self.volume = Volume.DEFAULT

        # Retune debounce
        self._retune_timer: Optional[threading.Timer] = None

        # Display mode (for INFO/MENU buttons)
        self.display_mode = 0  # 0=normal, 1=extended info, 2=filters only

        # Initialize components
        self.display = Display()
        self.controls = Controls(
            on_power=self._on_power,       # STANDBY
            on_play=self._on_play,         # SOURCE
            on_stop=self._on_stop,         # TIMER
            on_prev=self._on_prev,         # Button 4
            on_next=self._on_next,         # Button 5
            on_skip=self._on_skip,         # Button 6+
            on_era=self._on_era,           # Button 1
            on_location=self._on_location, # Button 2
            on_genre=self._on_genre,       # Button 3
            on_info=self._on_info,         # INFO
            on_menu=self._on_menu,         # MENU
            on_volume_change=self._on_volume_change,
            on_tuning_change=self._on_tuning_change,
        )
        self.audio = AudioPlayer(
            on_track_end=self._on_track_end,
            on_error=self._on_error,
        )
        self.api = AnamnesisAPI()

        # Set initial volume
        self.audio.set_volume(self.volume)

        # Setup signal handlers for clean shutdown
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

        print("Radio initialized!")

    def _get_current_filters(self) -> dict:
        """Get current filter settings as API parameters"""
        era = ERAS[self.era_index]
        location = LOCATIONS[self.location_index]
        genre = GENRES[self.genre_index]

        return {
            "era": era["query"],
            "location": location["query"],
            "genre": genre["query"],
        }

    def _get_filter_labels(self) -> dict:
        """Get current filter labels for display"""
        return {
            "era": ERAS[self.era_index]["label"],
            "location": LOCATIONS[self.location_index]["label"],
            "genre": GENRES[self.genre_index]["label"],
        }

    # === Button Handlers ===

    def _on_power(self):
        """Handle power button press"""
        self.powered_on = not self.powered_on
        print(f"Power: {'ON' if self.powered_on else 'OFF'}")

        if self.powered_on:
            self.display.show_startup()
            time.sleep(1)
            self._update_display()
            # Auto-play on power on
            self._start_playback()
        else:
            self.audio.stop()
            self.is_playing = False
            self.current_track = None
            self.queue = []
            self.display.show_off()

    def _on_play(self):
        """Handle play/pause button"""
        if not self.powered_on:
            return

        if self.is_playing:
            print("Pausing...")
            self.audio.pause()
            self.is_playing = False
        else:
            print("Playing...")
            self.audio.resume()
            self.is_playing = True

        self._update_display()

    def _on_stop(self):
        """Handle stop button"""
        if not self.powered_on:
            return

        print("Stopping...")
        self.audio.stop()
        self.is_playing = False
        self.current_track = None
        self.queue = []
        self._update_display()

    def _on_prev(self):
        """Handle previous button (not implemented - no history)"""
        if not self.powered_on:
            return
        print("Previous (no history available)")

    def _on_next(self):
        """Handle next button (5) - skip to next track"""
        if not self.powered_on:
            return

        print("Skipping to next...")
        self._play_next()

    def _on_skip(self):
        """Handle skip forward button (6+) - skip 30 seconds"""
        if not self.powered_on:
            return

        if self.audio and self.is_playing:
            pos = self.audio.get_position()
            dur = self.audio.get_duration()
            if pos is not None and dur is not None:
                new_pos = min(pos + 30, dur - 1)
                self.audio.player.seek(new_pos, reference='absolute')
                print(f"Skipped to {new_pos:.0f}s")

    def _on_info(self):
        """Handle INFO button - toggle extended track info display"""
        if not self.powered_on:
            return

        # Toggle between normal and extended info display
        self.display_mode = 1 if self.display_mode != 1 else 0
        print(f"Display mode: {'extended' if self.display_mode == 1 else 'normal'}")
        self._update_display()

    def _on_menu(self):
        """Handle MENU button - cycle display modes"""
        if not self.powered_on:
            return

        # Cycle through display modes: normal -> extended -> filters -> normal
        self.display_mode = (self.display_mode + 1) % 3
        modes = ['normal', 'extended info', 'filters only']
        print(f"Display mode: {modes[self.display_mode]}")
        self._update_display()

    def _on_era(self):
        """Cycle through era options"""
        if not self.powered_on:
            return

        self.era_index = (self.era_index + 1) % len(ERAS)
        print(f"Era: {ERAS[self.era_index]['label']}")
        self._schedule_retune()
        self._update_display()

    def _on_location(self):
        """Cycle through location options"""
        if not self.powered_on:
            return

        self.location_index = (self.location_index + 1) % len(LOCATIONS)
        print(f"Location: {LOCATIONS[self.location_index]['label']}")
        self._schedule_retune()
        self._update_display()

    def _on_genre(self):
        """Cycle through genre options"""
        if not self.powered_on:
            return

        self.genre_index = (self.genre_index + 1) % len(GENRES)
        print(f"Genre: {GENRES[self.genre_index]['label']}")
        self._schedule_retune()
        self._update_display()

    def _on_volume_change(self, value: int):
        """Handle volume potentiometer change (0-1023 from ADC)"""
        if not self.powered_on:
            return

        # Map ADC value (0-1023) to volume (0-100)
        self.volume = int((value / 1023) * 100)
        self.audio.set_volume(self.volume)
        self._update_display()

    def _on_tuning_change(self, value: int):
        """Handle tuning potentiometer change (0-1023 from ADC)"""
        if not self.powered_on:
            return

        # Map tuning pot to fine-tune within current era
        # For now, could scroll through era sub-ranges
        # This is a placeholder for more advanced tuning behavior
        pass

    # === Audio Callbacks ===

    def _on_track_end(self):
        """Called when current track finishes"""
        print("Track ended, playing next...")
        self._play_next()

    def _on_error(self, error: str):
        """Called on playback error"""
        print(f"Playback error: {error}")
        # Try next track
        self._play_next()

    # === Playback Logic ===

    def _schedule_retune(self):
        """Debounce filter changes before retuning"""
        if self._retune_timer:
            self._retune_timer.cancel()

        self._retune_timer = threading.Timer(
            Timing.RETUNE_DEBOUNCE_MS / 1000,
            self._retune
        )
        self._retune_timer.start()

    def _retune(self):
        """Clear queue and fetch new tracks with current filters"""
        print("Retuning radio...")
        self.is_loading = True
        self._update_display()

        # Stop current playback
        self.audio.stop()
        self.is_playing = False
        self.current_track = None
        self.queue = []

        # Start fresh
        self._start_playback()

    def _start_playback(self):
        """Start playback - fetch tracks and play"""
        self.is_loading = True
        self._update_display()

        # Fetch tracks in background
        thread = threading.Thread(target=self._fetch_and_play)
        thread.daemon = True
        thread.start()

    def _fetch_and_play(self):
        """Fetch tracks from API and start playing"""
        try:
            filters = self._get_current_filters()
            location = LOCATIONS[self.location_index]

            # Check for Antarctica easter egg
            if location["id"] == "antarctica":
                print("Penguin Radio mode!")
                tracks = self.api.get_penguin_radio()
            else:
                tracks = self.api.search(**filters)

            if tracks:
                self.queue = tracks
                self.is_loading = False
                self._play_next()
            else:
                print("No tracks found")
                self.is_loading = False
                self._update_display()

        except Exception as e:
            print(f"Error fetching tracks: {e}")
            self.is_loading = False
            self._update_display()

    def _play_next(self):
        """Play next track from queue"""
        if not self.queue:
            print("Queue empty, fetching more...")
            self._start_playback()
            return

        # Get next track
        track = self.queue.pop(0)
        self.current_track = track

        print(f"Playing: {track.get('title', 'Unknown')}")

        # Get stream URL
        if track.get("soundcloudId"):
            # Penguin Radio track
            stream_url = self.api.get_soundcloud_stream_url(track["soundcloudId"])
        else:
            # Archive.org track - need to get metadata first
            metadata = self.api.get_metadata(track["identifier"])
            if metadata and metadata.get("audioFiles"):
                audio_file = metadata["audioFiles"][0]["name"]
                stream_url = self.api.get_stream_url(track["identifier"], audio_file)
                # Update track with full metadata
                self.current_track["title"] = metadata.get("title", track.get("title"))
                self.current_track["creator"] = metadata.get("creator")
                self.current_track["date"] = metadata.get("date")
            else:
                print("No audio files found, skipping...")
                self._play_next()
                return

        # Play it
        self.audio.play(stream_url)
        self.is_playing = True
        self._update_display()

        # Prefetch more if queue is low
        if len(self.queue) < 3:
            thread = threading.Thread(target=self._prefetch_tracks)
            thread.daemon = True
            thread.start()

    def _prefetch_tracks(self):
        """Prefetch more tracks in background"""
        try:
            filters = self._get_current_filters()
            location = LOCATIONS[self.location_index]

            if location["id"] == "antarctica":
                tracks = self.api.get_penguin_radio()
            else:
                tracks = self.api.search(**filters)

            if tracks:
                self.queue.extend(tracks)
                print(f"Prefetched {len(tracks)} tracks, queue now has {len(self.queue)}")

        except Exception as e:
            print(f"Error prefetching: {e}")

    # === Display ===

    def _update_display(self):
        """Update OLED display with current state"""
        if not self.powered_on:
            self.display.show_off()
            return

        if self.is_loading:
            filters = self._get_filter_labels()
            self.display.show_tuning(filters)
            return

        if self.current_track:
            self.display.show_playing(
                track=self.current_track,
                filters=self._get_filter_labels(),
                volume=self.volume,
                is_paused=not self.is_playing,
            )
        else:
            self.display.show_idle(
                filters=self._get_filter_labels(),
                volume=self.volume,
            )

    # === Main Loop ===

    def run(self):
        """Main run loop"""
        print("Starting radio main loop...")
        print("Press Ctrl+C to exit")

        # Show startup
        self.display.show_off()

        try:
            while True:
                # Controls polling is handled in Controls class
                # Display updates happen on events
                time.sleep(0.1)

        except KeyboardInterrupt:
            self._shutdown(None, None)

    def _shutdown(self, signum, frame):
        """Clean shutdown"""
        print("\nShutting down...")

        self.audio.stop()
        self.controls.cleanup()
        self.display.show_off()

        print("Goodbye!")
        sys.exit(0)


if __name__ == "__main__":
    radio = Radio()
    radio.run()
