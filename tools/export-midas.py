"""
Export MiDaS-small from torch hub to ONNX and quantize to INT8.

Usage:
    python tools/export-midas.py

Output:
    apps/web/public/models/midas-small.onnx  (INT8, ~7 MB)
"""

import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT_DIR = ROOT / "apps/web/public/models"
FP32_PATH = OUT_DIR / "midas-small.fp32.onnx"
INT8_PATH = OUT_DIR / "midas-small.onnx"

try:
    import torch
    import numpy as np
    from onnxruntime.quantization import quantize_dynamic, QuantType
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install torch --index-url https://download.pytorch.org/whl/cpu onnx onnxruntime timm")
    sys.exit(1)


def export_fp32():
    print("Loading MiDaS_small from torch hub (downloads ~25 MB on first run)…")
    model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", trust_repo=True)
    model.eval()

    dummy = torch.randn(1, 3, 256, 256)

    print(f"Exporting FP32 ONNX to {FP32_PATH}…")
    torch.onnx.export(
        model,
        dummy,
        str(FP32_PATH),
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["depth"],
        dynamic_axes=None,
    )

    size_mb = FP32_PATH.stat().st_size / 1_000_000
    print(f"FP32 model saved ({size_mb:.1f} MB)")


def quantize_int8():
    print(f"Quantizing to INT8 → {INT8_PATH}…")
    quantize_dynamic(
        str(FP32_PATH),
        str(INT8_PATH),
        weight_type=QuantType.QInt8,
    )
    size_mb = INT8_PATH.stat().st_size / 1_000_000
    print(f"INT8 model saved ({size_mb:.1f} MB)")
    FP32_PATH.unlink()
    print("FP32 intermediate file removed.")


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    export_fp32()
    quantize_int8()
    print("\nDone. Place the model at apps/web/public/models/midas-small.onnx ✓")
