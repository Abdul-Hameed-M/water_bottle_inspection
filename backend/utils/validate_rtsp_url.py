"""Quick validation script for RTSP URL normalization."""

from backend.utils.stream_url import normalize_rtsp_url


def main() -> None:
    cases = [
        (
            "rtsp://admin:Nvr@spritle@172.16.16.22:554/streaming/channels/1",
            "rtsp://admin:Nvr%40spritle@172.16.16.22:554/streaming/channels/1",
        ),
        (
            "rtsp://admin:pa ss@10.0.0.1:554/stream?profile=1",
            "rtsp://admin:pa%20ss@10.0.0.1:554/stream?profile=1",
        ),
        (
            "rtsp://user:p@ss:word@camera.local:8554/live.sdp?transport=tcp",
            "rtsp://user:p%40ss%3Aword@camera.local:8554/live.sdp?transport=tcp",
        ),
    ]

    failures = [
        "",
        "rtsp://",
        "rtsp://@10.0.0.1:554/stream",
        "rtsp://admin:pass@:554/stream",
        "rtsp://10.0.0.1:bad/stream",
        "rtsp://10.0.0.1:554/stream path",
    ]

    for raw, expected in cases:
        normalized = normalize_rtsp_url(raw)
        assert normalized == expected, f"Unexpected normalization: {normalized}"

    for raw in failures:
        try:
            normalize_rtsp_url(raw)
            raise AssertionError(f"Expected ValueError for: {raw!r}")
        except ValueError:
            pass

    print("RTSP URL validation passed.")


if __name__ == "__main__":
    main()
