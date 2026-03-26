def cleanup_expired_sessions(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM sessions
            WHERE "expiresAt" < NOW()
        """)
        count = cur.rowcount
        if count > 0:
            print(f"  Deleted {count} expired session(s)")
