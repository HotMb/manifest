"""Offline contract and documentation checks; Python 3.11+.

Install the declared tooling with: python -m pip install -r requirements-dev.txt
These checks validate documentation contracts, not a running application.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate as validate_openapi


class ContractCheckError(ValueError):
    """A repository contract or example failed an intended check."""


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def require_local_refs(document: dict, document_path: Path, boundary: Path) -> None:
    """Fail before validators can resolve remote or out-of-repo references."""
    documents = {document_path.resolve(): document}
    visited: set[Path] = set()

    def walk(value: object, source: Path) -> None:
        if isinstance(value, list):
            for item in value:
                walk(item, source)
        elif isinstance(value, dict):
            reference = value.get("$ref")
            if isinstance(reference, str):
                parsed = urlsplit(reference)
                if parsed.scheme or parsed.netloc or parsed.query:
                    raise ContractCheckError(f"Non-local $ref in {source.name}: {reference}")
                target = (source.parent / unquote(parsed.path)).resolve() if parsed.path else source
                if not target.is_relative_to(boundary.resolve()):
                    raise ContractCheckError(f"$ref escapes contracts directory: {reference}")
                if target not in documents:
                    documents[target] = read_json(target)
                pointed: object = documents[target]
                if parsed.fragment:
                    fragment = unquote(parsed.fragment)
                    if not fragment.startswith("/"):
                        raise ContractCheckError(f"Unsupported reference anchor: {reference}")
                    try:
                        for part in fragment[1:].split("/"):
                            key = part.replace("~1", "/").replace("~0", "~")
                            pointed = pointed[int(key)] if isinstance(pointed, list) else pointed[key]
                    except (KeyError, IndexError, TypeError, ValueError) as exc:
                        raise ContractCheckError(f"Unresolved $ref: {reference}") from exc
                visit(target)
            for item in value.values():
                walk(item, source)

    def visit(source: Path) -> None:
        if source not in visited:
            visited.add(source)
            walk(documents[source], source)

    visit(document_path.resolve())


def validator_for(schema: dict, definition: str) -> Draft202012Validator:
    selected = dict(schema, **{"$ref": f"#/$defs/{definition}"})
    return Draft202012Validator(selected, format_checker=FormatChecker())


def negative_fixtures(snapshot: dict, command: dict, proposal: dict, snapshot_catalog: dict) -> list[tuple[str, str, dict]]:
    cases: list[tuple[str, str, dict]] = []

    def case(name: str, definition: str, value: dict) -> dict:
        candidate = deepcopy(value)
        cases.append((name, definition, candidate))
        return candidate

    case("wrong-schema-version", "Snapshot", snapshot)["schemaVersion"] = 999
    case("recursive-history", "Snapshot", snapshot)["revisions"] = []
    case("external-route", "Snapshot", snapshot)["pages"][0]["route"] = "https://example.invalid/"
    del case("missing-block-id", "Snapshot", snapshot)["pages"][0]["composition"]["content"][0]["props"]["id"]
    case("prototype-property", "Snapshot", snapshot)["pages"][0]["composition"]["content"][0]["props"]["__proto__"] = {}
    case("negative-version", "Command", command)["expectedDraftVersion"] = -1
    case("unknown-operation", "Command", command)["payload"]["operations"][0]["op"] = "execute_code"
    case("proposal-not-revision", "Proposal", proposal)["revisionId"] = "revision-example"
    case("reserved-theme-key", "Snapshot", snapshot)["theme"]["tokens"]["constructor"] = {"kind": "color", "value": "#ffffff"}
    approval = case("approval-missing-head-precondition", "Command", command)
    approval.update(action="approve", payload={"proposalId": None})
    approval.pop("expectedHeadRevisionId", None)
    case("unknown-catalog-component", "Snapshot", snapshot_catalog)["pages"][0]["catalogPage"]["nodes"][0]["component"]["id"] = "untrusted-component"
    return cases


def markdown_missing_links(root: Path) -> list[str]:
    missing: list[str] = []
    ignored = {".git", "node_modules", ".venv", "venv", "__pycache__"}
    pattern = re.compile(r"\]\((<[^>]+>|[^\s)]+)(?:\s+[\"'][^)]*)?\)")
    for path in sorted(root.rglob("*.md")):
        if any(part in ignored for part in path.relative_to(root).parts):
            continue
        text = path.read_text(encoding="utf-8-sig")
        # Examples in code fences are not rendered links.
        text = re.sub(r"```[^\n]*\n.*?```", "", text, flags=re.S)
        for match in pattern.finditer(text):
            link = match.group(1).strip("<>")
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target = (path.parent / unquote(parsed.path)).resolve()
            if not target.exists():
                missing.append(f"{path.relative_to(root).as_posix()}: {link}")
    return missing


def check_repository(root: Path, *, allow_missing_links: bool = False) -> dict:
    root = root.resolve()
    contract_dir = root / "docs/spec/contracts"
    schema_path = contract_dir / "domain.schema.json"
    api_path = contract_dir / "openapi.json"
    schema = read_json(schema_path)
    api = read_json(api_path)
    require_local_refs(schema, schema_path, contract_dir)
    require_local_refs(api, api_path, contract_dir)
    Draft202012Validator.check_schema(schema)
    examples = {}
    for name, definition in (("snapshot", "Snapshot"), ("snapshot_catalog", "Snapshot"), ("command", "Command"), ("proposal", "Proposal")):
        # Keep stable API/test keys while matching the repository's kebab-case fixture names.
        filename = name.replace("_", "-")
        value = read_json(contract_dir / f"examples/{filename}.json")
        errors = list(validator_for(schema, definition).iter_errors(value))
        if errors:
            error = errors[0]
            location = "/".join(map(str, error.absolute_path)) or "<root>"
            raise ContractCheckError(f"{name}.json rejected at {location}: {error.validator}")
        examples[name] = value
    cases = negative_fixtures(**examples)
    for name, definition, value in cases:
        if validator_for(schema, definition).is_valid(value):
            raise ContractCheckError(f"Negative fixture unexpectedly accepted: {name}")
    validate_openapi(api, base_uri=api_path.as_uri())
    missing = markdown_missing_links(root)
    if missing and not allow_missing_links:
        raise ContractCheckError("Missing local Markdown targets:\n" + "\n".join(missing))
    methods = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
    return {
        "schema": "valid",
        "examples": sorted(examples),
        "negative_fixtures_rejected": len(cases),
        "negative_cases": [case[0] for case in cases],
        "openapi": "valid-with-local-refs",
        "api_operations": sum(key in methods for item in api["paths"].values() for key in item),
        "missing_local_links": missing,
        "application_runtime_tested": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--allow-missing-links", action="store_true", help="Temporary bootstrap only; CI remains strict.")
    args = parser.parse_args()
    try:
        result = check_repository(args.root, allow_missing_links=args.allow_missing_links)
    except Exception as exc:
        print(f"Contract check failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
