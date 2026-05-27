from __future__ import annotations

import ctypes
import threading
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


def _interrupt_thread(thread_id: int | None) -> None:
    if thread_id is None:
        return
    exc = ctypes.py_object(TimeoutError)
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_ulong(thread_id), exc)
    if res > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_ulong(thread_id), None)


def run_with_timeout(seconds: int, fn: Callable[[], T]) -> T:
    result: list[T] = []
    error: list[BaseException] = []

    def target() -> None:
        try:
            result.append(fn())
        except BaseException as exc:  # noqa: BLE001
            error.append(exc)

    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    thread.join(seconds)

    if thread.is_alive():
        _interrupt_thread(thread.ident)
        thread.join(1)
        raise TimeoutError(f"셀 실행 시간({seconds}초)을 초과했습니다.")

    if error:
        raise error[0]

    return result[0]
