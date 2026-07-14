SHELL := /bin/zsh

APP_DIR := $(CURDIR)

.PHONY: help import validate build

help:
	@echo "Targets disponíveis:"
	@echo "  make import COURSE='system_design' MODULE='day_05_estrategias_de_cache'"
	@echo "  make validate"
	@echo "  make build"

import:
	@node $(APP_DIR)/scripts/import-course-module.mjs --course "$(COURSE)" --module "$(MODULE)"

validate:
	@cd $(APP_DIR) && npm run validate:banks

build:
	@cd $(APP_DIR) && npm run build
