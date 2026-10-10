# anamnesis.fm

*A time traveling radio.*

Listen in at [anamnesis.fm](https://anamnesis.fm).

---

The radio aggregates true radio broadcasts from these [Internet Archive](https://archive.org/) collections:

- [Old Time Radio](https://archive.org/details/oldtimeradio) - Golden age radio dramas, comedy, and music
- [Hip Hop Radio Archive](https://archive.org/details/hiphopradioarchive) - Classic hip-hop radio and mix shows
- [Radio Stations and Archives](https://archive.org/details/radiostationarchives) - Radio station recordings
- [Radio Shows and Broadcasts](https://archive.org/details/radioshowarchive) - Historic radio show recordings
- [Radio Free Crockett](https://archive.org/details/radiofreecrockett) - Eclectic radio programming
- [East Village Radio](https://archive.org/details/eastvillageradio) - NYC independent radio archive
- [Mystic Sound](https://archive.org/details/eastvillageradio-mystic-sound) - EVR world music show
- [Minimal Wave](https://archive.org/details/eastvillageradio-minimal-wave) - EVR synth and minimal wave
- [Peer Pressure](https://archive.org/details/eastvillageradio-peer-pressure) - EVR indie music show
- [The Holy Sh-t Sound System](https://archive.org/details/eastvillageradio-the-holy-sh-t-sound-system) - EVR eclectic mix
- [Forty Deuce](https://archive.org/details/eastvillageradio-forty-deuce) - EVR Times Square sounds
- [Jamaica Rock](https://archive.org/details/eastvillageradio-jamaica-rock) - EVR reggae and dancehall
- [Pop Goes the Future](https://archive.org/details/eastvillageradio-pop-goes-the-future) - EVR pop music show
- [The Ragged Phonograph Program](https://archive.org/details/eastvillageradio-the-ragged-phonograph-program) - EVR vintage sounds
- [RADIOINGRID](https://archive.org/details/eastvillageradio-radioingrid) - EVR experimental show
- [Black And Blue Take Over](https://archive.org/details/eastvillageradio-black-and-blue-take-over) - EVR blues and soul
- [Radio Tiana](https://archive.org/details/radiotiana) - International radio archive
- [Radia](https://archive.org/details/radiafm) - Independent radio art network
- [Radio Islam International](https://archive.org/details/radioislaminternational) - Islamic radio broadcasts
- [La Mosquitera Radio](https://archive.org/details/lamosquitera) - Spanish language radio
- [WJMS Radio](https://archive.org/details/wjms-radio) - Community radio archive
- [Radio Osorno](https://archive.org/details/osornoradio) - Chilean radio broadcasts
- [Ujyaalo Radio](https://archive.org/details/ujyaaloradio) - Nepali radio programming
- [WJZM Archives](https://archive.org/details/wjzmarchive) - Tennessee radio archive
- [Netherlands Radio Show Archives](https://archive.org/details/concertzender) - Dutch radio broadcasts
- [OID Radio Archives](https://archive.org/details/oidradioarchive) - Community radio recordings
- [Radio Trinitat Vella](https://archive.org/details/radiotrinitatvella) - Barcelona community radio
- [Radio VK Archive](https://archive.org/details/radiovkarchive) - Russian radio broadcasts
- [Schickele Mix](https://archive.org/details/SchickeleMix) - Peter Schickele's eclectic radio show
- [Moody Blues Radio](https://archive.org/details/moodybluesradio) - Band radio appearances

---

- [Fork this repository](https://github.com/Twarner491/anamnesis.fm/fork)
- [Watch this repo](https://github.com/Twarner491/anamnesis.fm/subscription)
- [Create issue](https://github.com/Twarner491/anamnesis.fm/issues/new)

## Development and verification

Use Node 22.12 or newer. Install with `npm ci` and `npm ci --prefix worker`.
Run `npm run dev --prefix worker` and `npm run dev` in separate terminals;
Astro proxies `/api` to the local worker on port 8787.

Before deploying, run `npm test`, `npm run check`, and `npm run build`.
The tests cover playback cancellation/races, retry limits, era filtering,
Archive query limits, stream ranges, and Penguin Radio's stable playlist ID.

The frontend deploys to GitHub Pages on a push to `main`. Deploy the API
separately with `npm run deploy --prefix worker`. Production defaults to
`https://anamnesis-api.teddy-557.workers.dev`; `PUBLIC_API_URL` can override it.

Penguin Radio uses SoundCloud playlist **2180699213** (11 recordings), at
[AntarticaFM](https://soundcloud.com/teddywarner/sets/antartica-fm). Using its ID
keeps account renames from breaking playback. It still depends on SoundCloud's
public API client ID and progressive MP3 availability. If playback fails, check
`/api/penguin-radio` and a `Range: bytes=0-1023` request to
`/api/soundcloud-stream/<soundcloudId>`; expect JSON and a 206 audio/mpeg response.

Archive coverage is finite. Empty region/era/genre combinations show a message;
the player does not silently replace them with another region or time period.
