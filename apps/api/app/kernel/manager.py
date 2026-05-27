from __future__ import annotations

import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.config import settings
from app.kernel.protocol import decode_message, encode_message


@dataclass
class KernelSession:
    session_id: str
    process: subprocess.Popen
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    allowed_paths: list[str] = field(default_factory=list)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def touch(self) -> None:
        self.last_active = time.time()


class KernelManager:
    def __init__(self) -> None:
        self._sessions: dict[str, KernelSession] = {}
        self._lock = threading.Lock()
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()

    def _cleanup_loop(self) -> None:
        while True:
            time.sleep(60)
            ttl = settings.session_ttl_minutes * 60
            now = time.time()
            expired: list[str] = []
            with self._lock:
                for sid, session in self._sessions.items():
                    if now - session.last_active > ttl:
                        expired.append(sid)
            for sid in expired:
                self.destroy(sid)

    def _spawn_worker(self, allowed_paths: list[str]) -> subprocess.Popen:
        cmd = [sys.executable, "-m", "app.kernel.worker"]
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(settings.base_dir),
            text=False,
            bufsize=0,
        )
        assert proc.stdin is not None
        assert proc.stdout is not None
        proc.stdin.write(encode_message({"allowed_paths": allowed_paths}))
        proc.stdin.flush()
        ready_line = proc.stdout.readline()
        if not ready_line:
            proc.kill()
            raise RuntimeError("워커 프로세스 시작 실패")
        ready = decode_message(ready_line)
        if ready.get("type") != "ready":
            proc.kill()
            raise RuntimeError("워커 준비 응답 오류")
        return proc

    def _restart_worker(self, session: KernelSession) -> None:
        try:
            if session.process.stdin:
                session.process.stdin.write(encode_message({"op": "shutdown"}))
                session.process.stdin.flush()
        except Exception:
            pass
        try:
            session.process.terminate()
            session.process.wait(timeout=2)
        except Exception:
            session.process.kill()
        session.process = self._spawn_worker(session.allowed_paths)

    def create(self, session_id: str | None = None) -> str:
        sid = session_id or str(uuid.uuid4())
        allowed_paths = [
            str(settings.data_dir.resolve()),
            str(settings.uploads_dir.resolve()),
            "data/",
            "uploads/",
        ]

        proc = self._spawn_worker(allowed_paths)

        session = KernelSession(session_id=sid, process=proc, allowed_paths=allowed_paths)
        with self._lock:
            self._sessions[sid] = session
        return sid

    def _read_response(self, session: KernelSession, timeout: float) -> dict[str, Any]:
        assert session.process.stdout is not None
        deadline = time.time() + timeout
        while time.time() < deadline:
            if session.process.poll() is not None:
                raise RuntimeError("워커 프로세스가 종료되었습니다.")
            line = session.process.stdout.readline()
            if line:
                return decode_message(line)
        raise TimeoutError(f"셀 실행 시간({int(timeout - 2)}초)을 초과했습니다.")

    def dispatch(self, session_id: str, op: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        with self._lock:
            session = self._sessions.get(session_id)
        if not session:
            raise KeyError("세션을 찾을 수 없습니다.")

        with session.lock:
            session.touch()
            msg = {"op": op, **(payload or {})}
            assert session.process.stdin is not None
            session.process.stdin.write(encode_message(msg))
            session.process.stdin.flush()
            try:
                response = self._read_response(session, settings.exec_timeout_seconds + 2)
            except TimeoutError:
                if op == "exec":
                    self._restart_worker(session)
                raise
            return response

    def destroy(self, session_id: str) -> None:
        with self._lock:
            session = self._sessions.pop(session_id, None)
        if not session:
            return
        try:
            if session.process.stdin:
                session.process.stdin.write(encode_message({"op": "shutdown"}))
                session.process.stdin.flush()
        except Exception:
            pass
        try:
            session.process.terminate()
            session.process.wait(timeout=3)
        except Exception:
            session.process.kill()

    def active_count(self) -> int:
        with self._lock:
            return len(self._sessions)


kernel_manager = KernelManager()
