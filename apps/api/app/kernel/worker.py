from __future__ import annotations

import io
import sys
import traceback
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from app.analysis.introspect import build_kernel_state
from app.config import settings
from app.kernel.limits import apply_resource_limits
from app.kernel.protocol import decode_message, encode_message
from app.kernel.safety import SafetyError, sanitize_builtins, validate_code
from app.kernel.timeout import run_with_timeout


def _block_network() -> None:
    try:
        import socket

        def _blocked(*args, **kwargs):  # type: ignore
            raise PermissionError("네트워크 접근이 차단되었습니다.")

        socket.socket = _blocked  # type: ignore
        socket.create_connection = _blocked  # type: ignore
    except Exception:
        pass


def _timeout_message() -> str:
    return f"셀 실행 시간({settings.exec_timeout_seconds}초)을 초과했습니다."


def _track_step_flags(source: str, stdout: str, namespace: dict[str, Any]) -> None:
    """가이드형 단계 검증: .predict() / .score() 실행 여부 추적."""
    import re

    flags: dict[str, Any] = dict(namespace.get("_lab_flags") or {})
    if re.search(r"\.predict\s*\(", source):
        flags["predict"] = True
    if re.search(r"\.score\s*\(", source):
        flags["score"] = True
        for line in stdout.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                val = float(line)
                if -10.0 <= val <= 1.0:
                    flags["score_value"] = val
                    break
            except ValueError:
                m = re.search(r"(-?\d+(?:\.\d+)?)", line)
                if m:
                    val = float(m.group(1))
                    if -10.0 <= val <= 1.0:
                        flags["score_value"] = val
                        break
    namespace["_lab_flags"] = flags


def _capture_figures() -> list[str]:
    images: list[str] = []
    for num in plt.get_fignums():
        fig = plt.figure(num)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
        buf.seek(0)
        import base64

        images.append(base64.b64encode(buf.read()).decode("ascii"))
        plt.close(fig)
    return images


def _preview_dataframes(namespace: dict[str, Any]) -> list[dict[str, Any]]:
    previews: list[dict[str, Any]] = []
    for name, value in namespace.items():
        if name.startswith("_"):
            continue
        if isinstance(value, pd.DataFrame):
            head = value.head(5).replace({np.nan: None}).to_dict(orient="records")
            previews.append(
                {
                    "name": name,
                    "shape": list(value.shape),
                    "columns": [str(c) for c in value.columns.tolist()],
                    "head": head,
                    "dtypes": {str(k): str(v) for k, v in value.dtypes.items()},
                }
            )
    return previews


def _execute_code(source: str, namespace: dict[str, Any], allowed_paths: list[str]) -> dict[str, Any]:
    validate_code(source)

    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()

    old_show = plt.show

    def _show_override(*args, **kwargs):
        _capture_figures()

    plt.show = _show_override

    def run_cell() -> None:
        with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
            compiled = compile(source, "<cell>", "exec")
            exec(compiled, namespace)  # noqa: S102

    try:
        run_with_timeout(settings.exec_timeout_seconds, run_cell)
    except TimeoutError as exc:
        raise TimeoutError(_timeout_message()) from exc
    finally:
        plt.show = old_show

    stdout_text = stdout_buf.getvalue()
    _track_step_flags(source, stdout_text, namespace)

    images = _capture_figures()
    return {
        "ok": True,
        "stdout": stdout_text,
        "stderr": stderr_buf.getvalue(),
        "error": None,
        "error_type": None,
        "images": images,
        "dataframes_preview": _preview_dataframes(namespace),
    }


def _resolve_csv_path(path: str) -> Path:
    normalized = str(path).replace("\\", "/").lstrip("./")
    candidates: list[Path] = []

    raw = Path(normalized)
    if raw.is_absolute():
        candidates.append(raw.resolve())
    else:
        candidates.append((settings.base_dir / normalized).resolve())
        # Fish.csv 처럼 파일명만 적어도 data/, uploads/ 에서 찾기
        if "/" not in normalized:
            candidates.append((settings.data_dir / normalized).resolve())
            candidates.append((settings.uploads_dir / normalized).resolve())
            for upload in settings.uploads_dir.glob(f"*_{normalized}"):
                candidates.append(upload.resolve())

    allowed_roots = [
        settings.data_dir.resolve(),
        settings.uploads_dir.resolve(),
        settings.base_dir.resolve(),
    ]

    seen: set[str] = set()
    for resolved in candidates:
        key = str(resolved)
        if key in seen:
            continue
        seen.add(key)

        if not any(str(resolved).startswith(str(root)) for root in allowed_roots):
            continue
        if resolved.is_file():
            return resolved

    raise FileNotFoundError(
        f"CSV 파일을 찾을 수 없습니다: {path!r}. "
        f"'Fish.csv' 또는 'data/Fish.csv' 형식으로 시도해 보세요."
    )


def _build_namespace(allowed_paths: list[str]) -> dict[str, Any]:
    namespace = sanitize_builtins(allowed_paths)
    _original_read_csv = pd.read_csv

    def safe_read_csv(path: str, *args, **kwargs):
        resolved = _resolve_csv_path(path)
        if "encoding" not in kwargs:
            kwargs.setdefault("encoding", "utf-8")
        return _original_read_csv(resolved, *args, **kwargs)

    pd_safe = pd
    pd_safe.read_csv = safe_read_csv  # type: ignore

    namespace.update(
        {
            "np": np,
            "pd": pd_safe,
            "plt": plt,
        }
    )
    return namespace


def main() -> None:
    apply_resource_limits()
    _block_network()

    init_line = sys.stdin.buffer.readline()
    if not init_line:
        return
    init_msg = decode_message(init_line)
    allowed_paths: list[str] = init_msg.get("allowed_paths", [])
    namespace = _build_namespace(allowed_paths)

    sys.stdout.buffer.write(encode_message({"type": "ready"}))
    sys.stdout.buffer.flush()

    while True:
        line = sys.stdin.buffer.readline()
        if not line:
            break
        msg = decode_message(line)
        op = msg.get("op")

        if op == "shutdown":
            break

        if op == "exec":
            source = msg.get("src", "")
            try:
                result = _execute_code(source, namespace, allowed_paths)
            except SafetyError as exc:
                result = {
                    "ok": False,
                    "stdout": "",
                    "stderr": "",
                    "error": str(exc),
                    "error_type": "SafetyError",
                    "images": [],
                    "dataframes_preview": [],
                }
            except TimeoutError as exc:
                result = {
                    "ok": False,
                    "stdout": "",
                    "stderr": "",
                    "error": str(exc),
                    "error_type": "TimeoutError",
                    "images": [],
                    "dataframes_preview": [],
                }
            except Exception as exc:
                result = {
                    "ok": False,
                    "stdout": "",
                    "stderr": traceback.format_exc(),
                    "error": str(exc),
                    "error_type": type(exc).__name__,
                    "images": [],
                    "dataframes_preview": [],
                }
            sys.stdout.buffer.write(encode_message({"type": "result", **result}))
            sys.stdout.buffer.flush()
            continue

        if op == "inspect":
            state = build_kernel_state(namespace)
            sys.stdout.buffer.write(encode_message({"type": "state", **state}))
            sys.stdout.buffer.flush()
            continue

        if op == "reset":
            namespace = _build_namespace(allowed_paths)
            sys.stdout.buffer.write(encode_message({"type": "reset_ok"}))
            sys.stdout.buffer.flush()
            continue

        if op == "autoplot":
            from app.viz.autoplot import generate_auto_plot

            algorithm = msg.get("algorithm")
            try:
                result = generate_auto_plot(namespace, algorithm)
                sys.stdout.buffer.write(encode_message({"type": "autoplot", **result}))
            except Exception as exc:
                sys.stdout.buffer.write(
                    encode_message({"type": "error", "error": str(exc), "error_type": type(exc).__name__})
                )
            sys.stdout.buffer.flush()
            continue


if __name__ == "__main__":
    main()
