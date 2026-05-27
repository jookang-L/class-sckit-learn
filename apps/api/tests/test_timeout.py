import time

import pytest

from app.kernel.timeout import run_with_timeout


def test_run_with_timeout_returns_value() -> None:
    assert run_with_timeout(2, lambda: 42) == 42


def test_run_with_timeout_raises() -> None:
    with pytest.raises(TimeoutError, match="1초"):
        run_with_timeout(1, lambda: time.sleep(3))
