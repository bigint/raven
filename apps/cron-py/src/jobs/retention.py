def cleanup_old_request_logs(conn, retention_days: int = 90) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM request_logs
            WHERE created_at < NOW() - INTERVAL '%s days'
            """,
            (retention_days,),
        )
        count = cur.rowcount
        if count > 0:
            print(f"  Deleted {count} request log(s) older than {retention_days} days")
