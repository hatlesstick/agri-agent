import json
import sys
import time
import urllib.request

url, secret, text = sys.argv[1], sys.argv[2], sys.argv[3]
body = json.dumps({"messages": [{"id": "u1", "role": "user", "parts": [{"type": "text", "text": text}]}]}).encode()
request = urllib.request.Request(url, data=body, method="POST", headers={"content-type": "application/json", "x-proxy-auth": secret})
started = time.monotonic()
arrivals = []
with urllib.request.urlopen(request, timeout=30) as response:
    if not response.headers.get("content-type", "").startswith("text/event-stream"):
        sys.exit(f"expected text/event-stream, got {response.headers.get('content-type')}")
    for line in response:
        if b'"type":"text-delta"' in line:
            arrivals.append(time.monotonic() - started)
if len(arrivals) < 5:
    sys.exit(f"expected at least 5 text deltas, got {len(arrivals)}")
spread = arrivals[-1] - arrivals[0]
print(f"deltas={len(arrivals)} first={arrivals[0]:.3f}s last={arrivals[-1]:.3f}s spread={spread:.3f}s")
if spread < 0.05:
    sys.exit("stream arrived as one block: the proxy buffers the response")
