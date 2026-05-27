from __future__ import annotations

import sys

try:
    import resource
except ImportError:  # Windows
    resource = None  # type: ignore


def apply_resource_limits() -> None:
    if resource is None or sys.platform == "win32":
        return

    # CPU time limit (seconds)
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
    # Address space ~512MB
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    # Max file size 5MB
    resource.setrlimit(resource.RLIMIT_FSIZE, (5 * 1024 * 1024, 5 * 1024 * 1024))
    # Disable fork bombs
    try:
        resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
    except (ValueError, OSError):
        pass
