from __future__ import annotations

import io
from contextlib import redirect_stdout

from app.analysis.introspect import build_kernel_state
from app.analysis.validators import validate_steps
from app.kernel.worker import _track_step_flags
from app.schemas import KernelState
from app.viz.autoplot import _estimator_matches
from sklearn.neighbors import KNeighborsClassifier

SCALING_BLOCK = """
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
scaler.fit(X_train)
X_train_s = scaler.transform(X_train)
X_test_s = scaler.transform(X_test)
"""


def _run(label: str, source: str, algorithm: str, expected: int) -> None:
    ns: dict = {}
    buf = io.StringIO()
    with redirect_stdout(buf):
        exec(source, ns)  # noqa: S102
    _track_step_flags(source, buf.getvalue(), ns)
    state = KernelState(**build_kernel_state(ns))
    vals = validate_steps(state, algorithm)
    passed = [v.step_id for v in vals if v.passed]
    failed = [(v.step_id, v.reason) for v in vals if not v.passed]
    assert len(passed) == expected, f"{label} expected {expected} passed, got {passed}, failed={failed}"


def test_knn_fish_flow() -> None:
    _run(
        "KNN",
        f"""
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
df = pd.read_csv('data/Fish.csv')
X = df[['Length1','Weight']]
y = df['Species']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
{SCALING_BLOCK}
model = KNeighborsClassifier(n_neighbors=3)
model.fit(X_train_s, y_train)
preds = model.predict(X_test_s)
print(model.score(X_test_s, y_test))
""",
        "KNN",
        8,
    )


def test_linear_regression_perch_flow() -> None:
    _run(
        "LinearRegression",
        """
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
df = pd.read_csv('data/Fish.csv')
fish = df[df['Species']=='Perch']
X = fish[['Length1']]
y = fish['Weight']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = LinearRegression()
model.fit(X_train, y_train)
preds = model.predict(X_test)
print(model.score(X_test, y_test))
""",
        "LinearRegression",
        7,
    )


def test_logistic_pokemon_flow() -> None:
    _run(
        "LogisticRegression",
        f"""
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
df = pd.read_csv('data/Pokemon.csv')
X = df[['HP','Attack','Defense','Speed']]
y = df['Legendary']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
{SCALING_BLOCK}
model = LogisticRegression(max_iter=1000)
model.fit(X_train_s, y_train)
preds = model.predict(X_test_s)
print(model.score(X_test_s, y_test))
""",
        "LogisticRegression",
        8,
    )


def test_decision_tree_fish_flow() -> None:
    _run(
        "DecisionTree",
        """
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
df = pd.read_csv('data/Fish.csv')
X = df[['Length1','Weight']]
y = df['Species']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = DecisionTreeClassifier(random_state=42)
model.fit(X_train, y_train)
preds = model.predict(X_test)
print(model.score(X_test, y_test))
""",
        "DecisionTree",
        7,
    )


def test_knn_without_scaling_fails_scale_step() -> None:
    ns: dict = {}
    exec(
        """
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
df = pd.read_csv('data/Fish.csv')
X = df[['Length1','Weight']]
y = df['Species']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = KNeighborsClassifier(n_neighbors=3)
model.fit(X_train, y_train)
""",
        ns,
    )
    state = KernelState(**build_kernel_state(ns))
    vals = {v.step_id: v.passed for v in validate_steps(state, "KNN")}
    assert vals["train_test_split"] is True
    assert vals["scale_features"] is False


def test_autoplot_knn_alias() -> None:
    assert _estimator_matches(KNeighborsClassifier(), "KNN")
