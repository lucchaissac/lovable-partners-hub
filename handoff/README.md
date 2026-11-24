# Portable Lovable handoff

These files build a separate US English source package without changing the running application's provider configuration or saved campaigns.

```sh
python3 scripts/export-lovable.py output/lovable-brand-hub
```

Wait for export to complete before installing dependencies in the output directory. The exporter uses the repository's installed TypeScript parser to preserve renderer code while removing old implementation comments. It reads only tracked application paths and overlays `handoff/portable/`.

Inside the output directory, run `npm ci`, `npm run build` and `npm test`, then inspect the galleries and editor through `npm start`. Keep `handoff/portable/docs/VERIFICATION.md` accurate before making the final export. Re-export to a fresh directory after changing handoff templates or the exporter; do not alter declared files after the manifest is written.

After validation, package from the repository root:

```sh
python3 scripts/package-lovable.py output/lovable-brand-hub output/lovable-brand-hub-en-US.zip
```

Packaging verifies the declared file hashes, rejects excluded paths, scans for private runtime references and recognizable credentials, compares any actual local secret values in memory, and checks ZIP integrity. No private value is printed or included. The ZIP contains source, assets, rules, integration documentation and tests; dependencies and build output are excluded.

The source application retains its existing providers and deployment settings. Handoff changes affect only the generated copy. Do not reset or alter the original environment or usage ledger as part of packaging.
