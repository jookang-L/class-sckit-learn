from __future__ import annotations

import ast
from typing import Iterable


BLOCKED_IMPORTS = {
    "os",
    "sys",
    "subprocess",
    "socket",
    "requests",
    "urllib",
    "ctypes",
    "multiprocessing",
    "shutil",
    "pickle",
    "builtins",
    "importlib",
    "pathlib",
    "glob",
    "tempfile",
    "webbrowser",
    "http",
    "ftplib",
    "smtplib",
}

ALLOWED_IMPORTS = {
    "numpy",
    "np",
    "pandas",
    "pd",
    "matplotlib",
    "plt",
    "seaborn",
    "sns",
    "sklearn",
    "math",
    "random",
    "statistics",
    "re",
    "collections",
    "itertools",
    "functools",
    "typing",
    "json",
    "datetime",
    "copy",
    "warnings",
}

BLOCKED_NAMES = {
    "eval",
    "exec",
    "compile",
    "open",
    "input",
    "breakpoint",
    "globals",
    "locals",
    "vars",
    "dir",
    "setattr",
    "delattr",
    "help",
    "memoryview",
    "bytearray",
}


class SafetyError(Exception):
    pass


def _module_root(name: str) -> str:
    return name.split(".")[0]


def _is_allowed_import(module: str | None) -> bool:
    if not module:
        return False
    root = _module_root(module)
    if root in BLOCKED_IMPORTS:
        return False
    if root in ALLOWED_IMPORTS:
        return True
    if module.startswith("sklearn.") or module.startswith("matplotlib."):
        return True
    return False


ALREADY_INJECTED = {"numpy", "np", "pandas", "pd", "matplotlib", "plt", "seaborn", "sns"}


class SafetyVisitor(ast.NodeVisitor):
    def __init__(self) -> None:
        self.errors: list[str] = []

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            root = _module_root(alias.name)
            if root in ALREADY_INJECTED or alias.name in ALREADY_INJECTED:
                self.errors.append(f"'{alias.name}'은(는) 이미 준비되어 있어요. pd, np, plt를 바로 사용하세요.")
                continue
            if not _is_allowed_import(alias.name):
                self.errors.append(f"허용되지 않은 import: {alias.name}")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        module = node.module or ""
        root = _module_root(module)
        if root in ALREADY_INJECTED:
            self.errors.append(f"'{module}'은(는) 이미 준비되어 있어요. pd, np, plt를 바로 사용하세요.")
            self.generic_visit(node)
            return
        if not _is_allowed_import(module):
            self.errors.append(f"허용되지 않은 import: {module}")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name) -> None:
        if node.id in BLOCKED_NAMES:
            self.errors.append(f"허용되지 않은 내장 함수/이름: {node.id}")
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        if node.attr in {"__class__", "__subclasses__", "__bases__", "__mro__", "__globals__"}:
            self.errors.append(f"허용되지 않은 속성 접근: {node.attr}")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_NAMES:
            self.errors.append(f"허용되지 않은 함수 호출: {node.func.id}")
        self.generic_visit(node)


def validate_code(source: str) -> None:
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        raise SafetyError(f"문법 오류: {exc.msg}") from exc

    visitor = SafetyVisitor()
    visitor.visit(tree)
    if visitor.errors:
        raise SafetyError("; ".join(visitor.errors[:3]))


def _check_import_allowed(name: str) -> None:
    root = _module_root(name)
    if root in ALREADY_INJECTED or name in ALREADY_INJECTED:
        raise ImportError(f"'{name}'은(는) 이미 준비되어 있어요. pd, np, plt를 바로 사용하세요.")
    if not _is_allowed_import(name):
        raise ImportError(f"허용되지 않은 import: {name}")


def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    """허용된 sklearn 등만 import 가능한 제한 __import__."""
    import builtins

    if level != 0:
        raise ImportError("상대 import는 허용되지 않습니다.")
    _check_import_allowed(name)
    for item in fromlist or ():
        sub = f"{name}.{item}" if name else str(item)
        root = _module_root(sub)
        if root in ALREADY_INJECTED:
            raise ImportError(f"'{sub}'은(는) 이미 준비되어 있어요.")
        if not _is_allowed_import(name) and not _is_allowed_import(sub):
            raise ImportError(f"허용되지 않은 import: {sub}")
    return builtins.__import__(name, globals, locals, fromlist, level)


def sanitize_builtins(allowed_paths: Iterable[str]) -> dict:
    import builtins

    safe: dict = {
        "True": True,
        "False": False,
        "None": None,
        "print": print,
        "range": range,
        "len": len,
        "min": min,
        "max": max,
        "sum": sum,
        "abs": abs,
        "round": round,
        "sorted": sorted,
        "reversed": reversed,
        "enumerate": enumerate,
        "zip": zip,
        "map": map,
        "filter": filter,
        "list": list,
        "dict": dict,
        "set": set,
        "tuple": tuple,
        "str": str,
        "int": int,
        "float": float,
        "bool": bool,
        "type": type,
        "isinstance": isinstance,
        "getattr": getattr,
        "__import__": _safe_import,
        "Exception": Exception,
        "ImportError": ImportError,
        "ValueError": ValueError,
        "TypeError": TypeError,
        "KeyError": KeyError,
        "IndexError": IndexError,
        "NameError": NameError,
        "ZeroDivisionError": ZeroDivisionError,
    }

    import pandas as pd

    allowed = tuple(allowed_paths)

    def safe_read_csv(path: str, *args, **kwargs):
        normalized = path.replace("\\", "/")
        if not any(normalized.startswith(prefix) for prefix in allowed):
            raise PermissionError("허용된 데이터 경로만 읽을 수 있습니다.")
        return pd.read_csv(path, *args, **kwargs)

    safe["__builtins__"] = safe
    return safe
