"""diapo — local preview server (no dependency, stdlib only)."""
import http.server, functools, webbrowser, os

HERE = os.path.dirname(os.path.abspath(__file__))

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        super().end_headers()
    def log_message(self, *a):
        pass

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--open", action="store_true")
    a = ap.parse_args()
    url = f"http://localhost:{a.port}/index.html"
    print(f"diapo running → {url}  (Ctrl+C to stop)")
    if a.open:
        webbrowser.open(url)
    http.server.ThreadingHTTPServer(
        ("127.0.0.1", a.port),
        functools.partial(H, directory=HERE)).serve_forever()
