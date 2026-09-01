"""Create the secret-free static bundle used by GitHub Pages."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "_site"

if TARGET.exists():
    shutil.rmtree(TARGET)
TARGET.mkdir()

# The browser application is plain HTML/CSS/JS. Copy only browser assets so
# update scripts, local tooling and .env never reach the public artifact.
excluded_assets = {"site-server.js"}
for item in ROOT.iterdir():
    if (
        item.is_file()
        and item.name not in excluded_assets
        and item.suffix.lower() in {".html", ".css", ".js", ".svg"}
    ):
        shutil.copy2(item, TARGET / item.name)

shutil.copytree(ROOT / "data", TARGET / "data")

# The public site is a read-only snapshot; its update button must never try to
# call the developer machine's local endpoint.
index = TARGET / "index.html"
content = index.read_text(encoding="utf-8")
if "share-static.js" not in content:
    content = content.replace(
        "</body>",
        '    <script src="share-static.js?v=1"></script>\n  </body>',
    )
index.write_text(content, encoding="utf-8")
