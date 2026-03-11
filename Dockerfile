FROM golang:1.24-alpine AS builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY gateway/go.mod gateway/go.sum ./gateway/
RUN cd gateway && go mod download

COPY gateway/ ./gateway/
COPY dashboard/dist ./dashboard/dist/

RUN cd gateway && CGO_ENABLED=1 go build -ldflags "-s -w" -tags embed -o /raven .

FROM alpine:3.21

RUN apk add --no-cache ca-certificates sqlite-libs

COPY --from=builder /raven /usr/local/bin/raven

RUN adduser -D -h /data raven
USER raven
WORKDIR /data

EXPOSE 8080

ENTRYPOINT ["raven", "serve"]
