"""Normalize IP camera and RTSP URLs before OpenCV capture."""
from urllib.parse import quote, urlparse, urlsplit, urlunparse

# IP Webcam (Android) MJPEG paths — try in order when auto-resolving
IP_WEBCAM_MJPEG_PATHS = (
    "/videofeed",
    "/video",
    "/mjpegfeed",
    "/mjpegfeed?640x480",
)

# DroidCam default port/path
DROIDCAM_PATHS = ("/video",)

# Snapshot fallback (polled when MJPEG open fails)
IP_WEBCAM_SNAPSHOT_PATHS = ("/shot.jpg", "/photoaf.jpg")


def normalize_ipcam_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        raise ValueError("IP camera URL is required")
    # Strip accidental trailing words from copy-paste (e.g. "8080 1" or "8080 Option 1")
    if " " in url and not url.startswith("rtsp://"):
        url = url.split()[0]
    if not url.startswith(("http://", "https://", "rtsp://")):
        url = f"http://{url}"
    parsed = urlparse(url)
    if not parsed.netloc:
        raise ValueError(f"Invalid IP camera URL: {url}")
    return url


def _host_port(parsed) -> str:
    host = parsed.hostname or ""
    port = parsed.port
    if port and port not in (80, 443):
        return f"{host}:{port}"
    return host


def build_ipcam_candidates(url: str) -> list[str]:
    """
    Build ordered HTTP URLs to try for phone cameras (IP Webcam, DroidCam).
    User URL is always tried first; common paths are added when missing or wrong.
    """
    base = normalize_ipcam_url(url)
    parsed = urlparse(base)
    if parsed.scheme not in ("http", "https"):
        return [base]

    path = (parsed.path or "").rstrip("/") or ""
    candidates: list[str] = []

    def add(u: str) -> None:
        if u not in candidates:
            candidates.append(u)

    add(base)

    # Host:port only — expand to standard stream paths
    if path in ("", "/"):
        for p in IP_WEBCAM_MJPEG_PATHS:
            add(urlunparse(parsed._replace(path=p)))
        return candidates

    # Wrong path hints from UI/docs (/video is DroidCam; IP Webcam uses /videofeed)
    if path in ("/video", "/videofeed", "/mjpegfeed"):
        if path != "/videofeed":
            add(urlunparse(parsed._replace(path="/videofeed")))
        if path != "/video":
            add(urlunparse(parsed._replace(path="/video")))
        if path != "/mjpegfeed":
            add(urlunparse(parsed._replace(path="/mjpegfeed")))
        add(urlunparse(parsed._replace(path="/mjpegfeed", query="640x480")))
        return candidates

    # Custom path — still try IP Webcam defaults on same host:port
    for p in IP_WEBCAM_MJPEG_PATHS:
        add(urlunparse(parsed._replace(path=p, query="")))

    return candidates


def build_ipcam_snapshot_urls(url: str) -> list[str]:
    """Snapshot URLs used when MJPEG stream cannot be opened."""
    base = normalize_ipcam_url(url)
    parsed = urlparse(base)
    if parsed.scheme not in ("http", "https"):
        return []

    out: list[str] = []
    for p in IP_WEBCAM_SNAPSHOT_PATHS:
        u = urlunparse(parsed._replace(path=p, query="", fragment=""))
        if u not in out:
            out.append(u)
    return out


def normalize_rtsp_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        raise ValueError("RTSP URL is required")

    lowered = url.lower()
    if not lowered.startswith("rtsp://"):
        if lowered.startswith("rtsp:"):
            url = f"rtsp://{url[5:]}"
        else:
            url = f"rtsp://{url}"

    rest = url[7:]
    if not rest:
        raise ValueError("Invalid RTSP URL: missing host")

    tail_start = len(rest)
    for delim in ("/", "?", "#"):
        idx = rest.find(delim)
        if idx != -1:
            tail_start = min(tail_start, idx)
    authority = rest[:tail_start]
    tail = rest[tail_start:]

    if not authority:
        raise ValueError("Invalid RTSP URL: missing host")

    userinfo = ""
    hostport = authority
    if "@" in authority:
        # Use the last @ so raw @ inside password does not break host parsing.
        userinfo, hostport = authority.rsplit("@", 1)
        if not userinfo:
            raise ValueError("Invalid RTSP URL: empty credentials before '@'")
        if ":" in userinfo:
            username, password = userinfo.split(":", 1)
            encoded_userinfo = (
                f"{quote(username, safe='-._~%')}:{quote(password, safe='-._~%')}"
            )
        else:
            encoded_userinfo = quote(userinfo, safe="-._~%")
        userinfo = f"{encoded_userinfo}@"

    if not hostport:
        raise ValueError("Invalid RTSP URL: missing host after credentials")

    try:
        host_part = urlsplit(f"//{hostport}")
        _ = host_part.port  # raises for malformed ports
    except ValueError as exc:
        raise ValueError(f"Invalid RTSP URL: {exc}") from exc

    if not host_part.hostname:
        raise ValueError("Invalid RTSP URL: missing host")

    normalized = f"rtsp://{userinfo}{hostport}{tail}"
    if any(ch.isspace() for ch in normalized):
        raise ValueError("Invalid RTSP URL: contains unescaped whitespace")

    parsed = urlparse(normalized)
    if parsed.scheme != "rtsp" or not parsed.netloc:
        raise ValueError("Invalid RTSP URL")
    return normalized


def ipcam_hotspot_hint() -> str:
    return (
        "Mobile hotspot setup: On the phone, start IP Webcam and tap Start server. "
        "Connect the Mac to the phone hotspot (not the other way around). "
        "On Android hotspots the phone is usually http://192.168.43.1:8080/videofeed "
        "(some Samsung devices use 192.168.49.1). "
        "In IP Webcam, open the browser link shown on screen and copy the address before /videofeed. "
        "Disable AP/client isolation in hotspot settings if the Mac cannot reach the phone. "
        "Test in Safari: http://PHONE_IP:8080/ — you should see the IP Webcam page."
    )
