import logging
import os
import signal
import sys

import psycopg2.pool
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from src.jobs.invitations import cleanup_expired_invitations
from src.jobs.keys import deactivate_expired_keys
from src.jobs.retention import cleanup_old_request_logs
from src.jobs.sessions import cleanup_expired_sessions
from src.jobs.verifications import cleanup_expired_verifications

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("raven.cron")

DATABASE_URL = os.environ.get("DATABASE_URL", "")
RETENTION_DAYS = int(os.environ.get("LOG_RETENTION_DAYS", "90"))

pool: psycopg2.pool.ThreadedConnectionPool | None = None


def get_connection():
    assert pool is not None
    return pool.getconn()


def put_connection(conn):
    assert pool is not None
    pool.putconn(conn)


def run_job(name: str, fn, **kwargs):
    logger.info("Running job: %s", name)
    conn = get_connection()
    try:
        fn(conn, **kwargs)
        conn.commit()
        logger.info("Completed job: %s", name)
    except Exception:
        conn.rollback()
        logger.exception("Failed job: %s", name)
    finally:
        put_connection(conn)


def main():
    global pool

    if not DATABASE_URL:
        logger.error("DATABASE_URL is required")
        sys.exit(1)

    pool = psycopg2.pool.ThreadedConnectionPool(1, 5, DATABASE_URL)
    logger.info("Connected to database")

    scheduler = BlockingScheduler()

    # Hourly: deactivate expired keys
    scheduler.add_job(
        run_job,
        CronTrigger(minute=0),
        args=["deactivate_expired_keys", deactivate_expired_keys],
        id="deactivate_keys",
    )

    # Daily at 2am: cleanup old request logs
    scheduler.add_job(
        run_job,
        CronTrigger(hour=2, minute=0),
        args=["cleanup_old_request_logs", cleanup_old_request_logs],
        kwargs={"retention_days": RETENTION_DAYS},
        id="cleanup_logs",
    )

    # Daily at 3am: cleanup expired sessions
    scheduler.add_job(
        run_job,
        CronTrigger(hour=3, minute=0),
        args=["cleanup_expired_sessions", cleanup_expired_sessions],
        id="cleanup_sessions",
    )

    # Daily at 3:15am: cleanup expired verifications
    scheduler.add_job(
        run_job,
        CronTrigger(hour=3, minute=15),
        args=["cleanup_expired_verifications", cleanup_expired_verifications],
        id="cleanup_verifications",
    )

    # Daily at 3:30am: cleanup expired invitations
    scheduler.add_job(
        run_job,
        CronTrigger(hour=3, minute=30),
        args=["cleanup_expired_invitations", cleanup_expired_invitations],
        id="cleanup_invitations",
    )

    def shutdown(signum, _frame):
        logger.info("Received signal %s, shutting down...", signum)
        scheduler.shutdown(wait=True)
        if pool:
            pool.closeall()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    logger.info("Cron scheduler started with %d jobs", len(scheduler.get_jobs()))
    scheduler.start()


if __name__ == "__main__":
    main()
