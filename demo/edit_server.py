"""Serves the repo for the demo pages and lets demo/editor.html save the dashboard YAML.

    python3 demo/edit_server.py        → http://localhost:8770/demo/editor.html

Only examples/plc-dashboard.yaml can be written, and only from this machine.
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WRITABLE = {"/examples/plc-dashboard.yaml"}
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8770


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_PUT(self):
        path = self.path.split("?")[0]
        if path not in WRITABLE:
            self.send_error(403, "Not writable")
            return
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        target = os.path.join(ROOT, path.lstrip("/"))
        tmp = target + ".tmp"
        with open(tmp, "wb") as f:
            f.write(body)
        os.replace(tmp, target)
        self.send_response(204)
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Editor: http://localhost:{PORT}/demo/editor.html")
    server.serve_forever()
