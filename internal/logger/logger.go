package logger

import (
	"context"
	"log/slog"
	"os"
)

var Log *slog.Logger

func Init(isProduction bool) {
	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}
	if !isProduction {
		opts.Level = slog.LevelDebug
	}

	handler := slog.NewJSONHandler(os.Stdout, opts)
	Log = slog.New(handler)
	slog.SetDefault(Log)
}

func Info(msg string, args ...any) {
	Log.Info(msg, args...)
}

func Warn(msg string, args ...any) {
	Log.Warn(msg, args...)
}

func Error(msg string, err error, args ...any) {
	if err != nil {
		args = append(args, "error", err.Error())
	}
	Log.Error(msg, args...)
}

func With(args ...any) *slog.Logger {
	return Log.With(args...)
}

func WithContext(ctx context.Context) *slog.Logger {
	return Log.With("ctx", ctx)
}
