"""
Generate a depth map for the fallback portrait using MiDaS via PyTorch.

Usage:
    python tools/generate-fallback.py

Reads:   apps/web/public/fallback/portrait.jpg
Writes:  apps/web/public/fallback/portrait-depth.png
"""

import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
PORTRAIT_PATH = ROOT / "apps/web/public/fallback/portrait.jpg"
DEPTH_PATH = ROOT / "apps/web/public/fallback/portrait-depth.png"

try:
    import torch
    import numpy as np
    from PIL import Image
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install torch --index-url https://download.pytorch.org/whl/cpu pillow numpy")
    sys.exit(1)


if __name__ == "__main__":
    if not PORTRAIT_PATH.exists():
        print(f"Portrait not found at {PORTRAIT_PATH}")
        print("Place your portrait photo there and run this script again.")
        sys.exit(1)

    MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    STD = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)

    print("Loading MiDaS_small from cache (no re-download needed)...")
    model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", trust_repo=True)
    model.eval()

    print(f"Loading portrait from {PORTRAIT_PATH}...")
    portrait = Image.open(PORTRAIT_PATH).convert("RGB")

    # Manual transform: resize to 256x256, normalize, to tensor
    resized = portrait.resize((256, 256), Image.LANCZOS)
    arr = np.array(resized, dtype=np.float32) / 255.0          # HWC float32
    tensor = torch.from_numpy(arr).permute(2, 0, 1)             # CHW
    tensor = (tensor - MEAN) / STD                              # normalize
    input_batch = tensor.unsqueeze(0)                           # NCHW

    print("Running depth estimation...")
    with torch.no_grad():
        prediction = model(input_batch)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1),
            size=portrait.size[::-1],
            mode="bicubic",
            align_corners=False,
        ).squeeze()

    depth = prediction.numpy()
    depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
    depth_img = Image.fromarray((depth * 255).astype("uint8"), mode="L")
    depth_img.save(str(DEPTH_PATH))

    w, h = portrait.size
    print(f"Depth map saved to {DEPTH_PATH} ({w}x{h} px)")
    print("Done. Assets are ready for the fallback pipeline.")
