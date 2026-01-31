"""
Audio Playback for Anamnesis.fm Radio
Uses mpv for robust HTTP streaming
"""

import threading
from typing import Callable, Optional

try:
    import mpv
    MPV_AVAILABLE = True
except ImportError:
    MPV_AVAILABLE = False
    print("Warning: python-mpv not available, audio disabled")


class AudioPlayer:
    """Audio player using mpv"""

    def __init__(
        self,
        on_track_end: Callable,
        on_error: Callable[[str], None],
    ):
        self.on_track_end = on_track_end
        self.on_error = on_error

        self.player: Optional[mpv.MPV] = None
        self._volume = 50
        self._is_playing = False

        self._setup_player()

    def _setup_player(self):
        """Initialize mpv player"""
        if not MPV_AVAILABLE:
            return

        try:
            self.player = mpv.MPV(
                # Audio output settings
                ao='alsa',  # Use ALSA for Pi
                audio_device='auto',

                # No video
                video=False,
                vo='null',

                # Performance settings
                cache=True,
                cache_secs=10,
                demuxer_max_bytes='50MiB',

                # Network settings for streaming
                stream_buffer_size='1MiB',

                # Logging
                log_handler=self._log_handler,
                loglevel='warn',
            )

            # Register event handlers
            @self.player.event_callback('end-file')
            def on_end(event):
                self._handle_end_file(event)

            print("mpv player initialized")

        except Exception as e:
            print(f"Failed to initialize mpv: {e}")
            self.player = None

    def _log_handler(self, loglevel: str, component: str, message: str):
        """Handle mpv log messages"""
        if loglevel in ('error', 'fatal'):
            print(f"mpv {loglevel}: {message}")

    def _handle_end_file(self, event):
        """Handle track end or error"""
        if not event:
            return

        reason = event.get('reason', 'unknown')

        if reason == 'eof':
            # Normal end of file
            self._is_playing = False
            self.on_track_end()
        elif reason == 'error':
            # Playback error
            self._is_playing = False
            error_msg = event.get('file_error', 'Unknown error')
            self.on_error(error_msg)
        elif reason == 'stop':
            # Manually stopped
            self._is_playing = False

    def play(self, url: str):
        """Play audio from URL"""
        if not self.player:
            print(f"Would play: {url}")
            return

        try:
            print(f"Playing: {url[:80]}...")
            self.player.play(url)
            self.player.wait_until_playing()
            self._is_playing = True

        except Exception as e:
            print(f"Play error: {e}")
            self.on_error(str(e))

    def pause(self):
        """Pause playback"""
        if self.player and self._is_playing:
            self.player.pause = True

    def resume(self):
        """Resume playback"""
        if self.player:
            self.player.pause = False
            self._is_playing = True

    def stop(self):
        """Stop playback"""
        if self.player:
            try:
                self.player.stop()
            except:
                pass
        self._is_playing = False

    def set_volume(self, volume: int):
        """Set volume (0-100)"""
        self._volume = max(0, min(100, volume))

        if self.player:
            try:
                self.player.volume = self._volume
            except:
                pass

    def get_volume(self) -> int:
        """Get current volume"""
        return self._volume

    def is_playing(self) -> bool:
        """Check if currently playing"""
        return self._is_playing

    def get_position(self) -> Optional[float]:
        """Get current playback position in seconds"""
        if self.player and self._is_playing:
            try:
                return self.player.time_pos
            except:
                pass
        return None

    def get_duration(self) -> Optional[float]:
        """Get track duration in seconds"""
        if self.player and self._is_playing:
            try:
                return self.player.duration
            except:
                pass
        return None

    def cleanup(self):
        """Clean up player resources"""
        if self.player:
            try:
                self.player.terminate()
            except:
                pass


class MockAudioPlayer(AudioPlayer):
    """Mock audio player for testing without mpv"""

    def __init__(self, **kwargs):
        self.on_track_end = kwargs.get('on_track_end', lambda: None)
        self.on_error = kwargs.get('on_error', lambda e: None)
        self.player = None
        self._volume = 50
        self._is_playing = False
        self._current_url = None
        print("Mock audio player initialized")

    def _setup_player(self):
        pass

    def play(self, url: str):
        print(f"[Mock] Playing: {url[:60]}...")
        self._current_url = url
        self._is_playing = True

    def pause(self):
        print("[Mock] Paused")
        self._is_playing = False

    def resume(self):
        print("[Mock] Resumed")
        self._is_playing = True

    def stop(self):
        print("[Mock] Stopped")
        self._is_playing = False
        self._current_url = None

    def simulate_end(self):
        """Simulate track ending for testing"""
        self._is_playing = False
        self.on_track_end()

    def cleanup(self):
        pass
