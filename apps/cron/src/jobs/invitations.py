def cleanup_expired_invitations(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM invitations
            WHERE "expiresAt" < NOW()
              AND "acceptedAt" IS NULL
        """)
        count = cur.rowcount
        if count > 0:
            print(f"  Deleted {count} expired invitation(s)")
