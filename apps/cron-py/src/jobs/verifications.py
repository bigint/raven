def cleanup_expired_verifications(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM verifications
            WHERE "expiresAt" < NOW()
        """)
        count = cur.rowcount
        if count > 0:
            print(f"  Deleted {count} expired verification(s)")
