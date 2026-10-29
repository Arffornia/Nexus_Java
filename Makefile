# Thin wrappers over npm. `make check` is what CI runs.
.PHONY: install check lint typecheck test build clean

install:
	npm ci

# No linter is configured yet: lint is the strict TypeScript type-check.
lint: typecheck

typecheck:
	npx tsc --noEmit

test:
	npm test

build:
	npm run build

check: lint test build

clean:
	rm -rf dist
