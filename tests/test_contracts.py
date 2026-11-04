"""Mutation tests for the contract checker; no network or paid inference."""

import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from jsonschema.exceptions import SchemaError


REPOSITORY = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_contracts", REPOSITORY / "scripts/check_contracts.py")
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class ContractCheckerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(REPOSITORY / "docs/spec/contracts", self.root / "docs/spec/contracts")

    def change_json(self, name, mutate):
        path = self.root / "docs/spec/contracts" / name
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        mutate(data)
        path.write_text(json.dumps(data), encoding="utf-8")

    def test_valid_contracts_and_eleven_negative_fixtures(self):
        result = checker.check_repository(self.root)
        self.assertEqual(result["negative_fixtures_rejected"], 11)
        self.assertEqual(result["api_operations"], 15)
        self.assertIn("snapshot_catalog", result["examples"])
        self.assertFalse(result["application_runtime_tested"])

    def test_broken_example_is_rejected(self):
        self.change_json("examples/snapshot.json", lambda data: data.update(schemaVersion=99))
        with self.assertRaisesRegex(checker.ContractCheckError, "snapshot.json rejected"):
            checker.check_repository(self.root)

    def test_invalid_schema_is_rejected(self):
        self.change_json("domain.schema.json", lambda data: data["$defs"]["Snapshot"].update(type="unknown-type"))
        with self.assertRaises(SchemaError):
            checker.check_repository(self.root)

    def test_broken_local_reference_is_rejected(self):
        self.change_json("domain.schema.json", lambda data: data.update({"$ref": "#/$defs/Absent"}))
        with self.assertRaisesRegex(checker.ContractCheckError, "Unresolved"):
            checker.check_repository(self.root)

    def test_remote_reference_is_rejected_before_resolution(self):
        self.change_json("domain.schema.json", lambda data: data.update({"$ref": "https://example.invalid/remote.json"}))
        with self.assertRaisesRegex(checker.ContractCheckError, "Non-local"):
            checker.check_repository(self.root)

    def test_reference_cannot_escape_contracts_directory(self):
        self.change_json("domain.schema.json", lambda data: data.update({"$ref": "../outside.json"}))
        with self.assertRaisesRegex(checker.ContractCheckError, "escapes"):
            checker.check_repository(self.root)

    def test_missing_markdown_target_fails_strict_check(self):
        (self.root / "README.md").write_text("[missing](docs/not-created.md)", encoding="utf-8")
        with self.assertRaisesRegex(checker.ContractCheckError, "Missing local Markdown"):
            checker.check_repository(self.root)
        result = checker.check_repository(self.root, allow_missing_links=True)
        self.assertEqual(len(result["missing_local_links"]), 1)

    def test_existing_relative_links_and_web_links(self):
        (self.root / "README.md").write_text("[schema](docs/spec/contracts/domain.schema.json#/$defs/Snapshot) [web](https://example.invalid) [anchor](#title)", encoding="utf-8")
        self.assertEqual(checker.markdown_missing_links(self.root), [])


if __name__ == "__main__":
    unittest.main()
