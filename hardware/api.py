"""
API Client for Anamnesis.fm
Communicates with the Cloudflare Worker backend
"""

import time
from typing import Optional, List
import requests

from config import API_BASE_URL, Timing


class AnamnesisAPI:
    """Client for anamnesis.fm API"""

    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'anamnesis-radio-pi/1.0',
            'Accept': 'application/json',
        })

        # Track recently played to exclude from searches
        self._recently_played: List[str] = []
        self._max_recent = 20

    def _add_to_recent(self, identifier: str):
        """Add identifier to recently played list"""
        if identifier not in self._recently_played:
            self._recently_played.append(identifier)
            if len(self._recently_played) > self._max_recent:
                self._recently_played.pop(0)

    def search(
        self,
        era: Optional[str] = None,
        location: Optional[str] = None,
        genre: Optional[str] = None,
        page: int = 1,
    ) -> List[dict]:
        """
        Search for tracks with given filters

        Args:
            era: Era/decade query (e.g., "1940-1949")
            location: Location query (e.g., "North America")
            genre: Genre query (e.g., "jazz")
            page: Page number

        Returns:
            List of track items
        """
        params = {
            '_t': str(int(time.time() * 1000)),  # Cache buster
            'page': str(page),
        }

        if era:
            params['era'] = era
        if location:
            params['location'] = location
        if genre:
            params['genre'] = genre

        # Exclude recently played
        if self._recently_played:
            params['exclude'] = ','.join(self._recently_played)

        try:
            url = f"{self.base_url}/api/search"
            response = self.session.get(
                url,
                params=params,
                timeout=Timing.API_TIMEOUT_S,
            )
            response.raise_for_status()
            data = response.json()

            items = data.get('items', [])
            print(f"Search returned {len(items)} items")
            return items

        except requests.Timeout:
            print("Search timeout")
            return []
        except requests.RequestException as e:
            print(f"Search error: {e}")
            return []

    def get_metadata(self, identifier: str) -> Optional[dict]:
        """
        Get full metadata for an archive.org item

        Args:
            identifier: Archive.org item identifier

        Returns:
            Metadata dict with audioFiles, or None on error
        """
        try:
            url = f"{self.base_url}/api/metadata/{identifier}"
            response = self.session.get(url, timeout=Timing.API_TIMEOUT_S)
            response.raise_for_status()

            data = response.json()

            # Track as played
            self._add_to_recent(identifier)

            return data

        except requests.RequestException as e:
            print(f"Metadata error for {identifier}: {e}")
            return None

    def get_stream_url(self, identifier: str, filename: str) -> str:
        """
        Get the proxied stream URL for an audio file

        Args:
            identifier: Archive.org item identifier
            filename: Audio file name

        Returns:
            Full stream URL
        """
        # URL encode the filename
        encoded_filename = requests.utils.quote(filename, safe='')
        return f"{self.base_url}/api/stream/{identifier}/{encoded_filename}"

    def get_penguin_radio(self) -> List[dict]:
        """
        Get Penguin Radio (Antarctica easter egg) tracks

        Returns:
            List of SoundCloud track items
        """
        try:
            url = f"{self.base_url}/api/penguin-radio"
            response = self.session.get(url, timeout=Timing.API_TIMEOUT_S)
            response.raise_for_status()
            data = response.json()

            items = data.get('items', [])
            print(f"Penguin Radio returned {len(items)} items")
            return items

        except requests.RequestException as e:
            print(f"Penguin Radio error: {e}")
            return []

    def get_soundcloud_stream_url(self, track_id: int) -> str:
        """
        Get the proxied stream URL for a SoundCloud track

        Args:
            track_id: SoundCloud track ID

        Returns:
            Full stream URL
        """
        return f"{self.base_url}/api/soundcloud-stream/{track_id}"

    def heartbeat(self) -> bool:
        """
        Send heartbeat to indicate active listener

        Returns:
            True if successful
        """
        try:
            url = f"{self.base_url}/api/heartbeat"
            response = self.session.get(url, timeout=5)
            return response.ok
        except:
            return False

    def get_listener_count(self) -> Optional[int]:
        """
        Get current listener count

        Returns:
            Number of active listeners, or None on error
        """
        try:
            url = f"{self.base_url}/api/listeners"
            response = self.session.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            return data.get('count')
        except:
            return None


# Simple test
if __name__ == "__main__":
    api = AnamnesisAPI()

    print("Testing search...")
    items = api.search(era="1940-1949", genre="jazz")
    if items:
        print(f"Found {len(items)} items")
        item = items[0]
        print(f"First item: {item.get('title', item.get('identifier'))}")

        print("\nTesting metadata...")
        meta = api.get_metadata(item['identifier'])
        if meta:
            print(f"Title: {meta.get('title')}")
            print(f"Audio files: {len(meta.get('audioFiles', []))}")

            if meta.get('audioFiles'):
                stream_url = api.get_stream_url(
                    item['identifier'],
                    meta['audioFiles'][0]['name']
                )
                print(f"Stream URL: {stream_url[:80]}...")

    print("\nTesting Penguin Radio...")
    penguins = api.get_penguin_radio()
    if penguins:
        print(f"Found {len(penguins)} penguin tracks")
        print(f"First: {penguins[0].get('title')}")
