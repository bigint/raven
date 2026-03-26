def deactivate_expired_keys(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE virtual_keys
            SET "isActive" = false
            WHERE "isActive" = true
              AND "expiresAt" IS NOT NULL
              AND "expiresAt" < NOW()
        """)
        count = cur.rowcount
        if count > 0:
            print(f"  Deactivated {count} expired key(s)")
