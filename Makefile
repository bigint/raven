.PHONY: build dev api cron lint

build:
	go build -o bin/api ./cmd/api
	go build -o bin/cron ./cmd/cron

dev:
	go run ./cmd/api

api:
	go run ./cmd/api

cron:
	go run ./cmd/cron

lint:
	golangci-lint run ./...
