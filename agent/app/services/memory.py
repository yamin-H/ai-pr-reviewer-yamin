import asyncpg
from app.core.config import DATABASE_URL
from app.services.embeddings import embed

async def store_decision(
    org_id: str,
    repo_id: str,
    content: str,
    decision_type: str,
    outcome: str,
    pr_number: int,
    file_path: str = None
):
    """Embed a past decision and store it in pgvector."""
    vector = embed(content)
    vector_str = "[" + ",".join(str(x) for x in vector) + "]"

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Note: Prisma creates tables and columns case-sensitive unless @map is used.
        # Resolve actual Organization.id and Repo.id if passed login or fullName
        resolved_org = await conn.fetchval("""
            SELECT "id" FROM "Organization" WHERE "id" = $1 OR "login" = $1 LIMIT 1
        """, org_id)

        if not resolved_org:
            try:
                resolved_org = await conn.fetchval("""
                    INSERT INTO "Organization" ("id", "githubId", "login", "installationId", "createdAt")
                    VALUES (gen_random_uuid()::text, $1, $1, 0, NOW())
                    ON CONFLICT ("login") DO UPDATE SET "login" = EXCLUDED."login"
                    RETURNING "id"
                """, org_id)
            except Exception:
                resolved_org = await conn.fetchval("""
                    SELECT "id" FROM "Organization" WHERE "id" = $1 OR "login" = $1 LIMIT 1
                """, org_id)
        final_org_id = resolved_org or org_id

        resolved_repo = await conn.fetchval("""
            SELECT "id" FROM "Repo" WHERE "id" = $1 OR "fullName" = $1 OR "name" = $1 LIMIT 1
        """, repo_id)

        if not resolved_repo:
            repo_name = repo_id.split("/")[-1] if "/" in repo_id else repo_id
            try:
                resolved_repo = await conn.fetchval("""
                    INSERT INTO "Repo" ("id", "githubId", "name", "fullName", "private", "orgId", "createdAt")
                    VALUES (gen_random_uuid()::text, $1, $2, $1, false, $3, NOW())
                    ON CONFLICT ("githubId") DO UPDATE SET "fullName" = EXCLUDED."fullName"
                    RETURNING "id"
                """, repo_id, repo_name, final_org_id)
            except Exception:
                resolved_repo = await conn.fetchval("""
                    SELECT "id" FROM "Repo" WHERE "id" = $1 OR "fullName" = $1 OR "name" = $1 LIMIT 1
                """, repo_id)
        final_repo_id = resolved_repo or repo_id

        await conn.execute("""
            INSERT INTO "MemoryEntry" 
            ("id", "orgId", "repoId", "content", "embedding", "decisionType", "outcome", "prNumber", "filePath")
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, $5, $6, $7, $8)
        """, final_org_id, final_repo_id, content, vector_str, decision_type, outcome, pr_number, file_path)

        print(f"Stored decision for PR #{pr_number}: {content[:60]}...")
    finally:
        await conn.close()


async def search_memory(
    repo_id: str,
    query: str,
    limit: int = 5
) -> list[dict]:
    """Search for similar past decisions using cosine similarity."""
    vector = embed(query)
    vector_str = "[" + ",".join(str(x) for x in vector) + "]"

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch("""
            SELECT 
                "content",
                "decisionType" as decision_type,
                "outcome",
                "prNumber" as pr_number,
                "filePath" as file_path,
                1 - ("embedding" <=> $1::vector) as similarity
            FROM "MemoryEntry"
            WHERE "repoId" IN (
                SELECT "id" FROM "Repo" WHERE "id" = $2 OR "fullName" = $2 OR "name" = $2
            ) OR "repoId" = $2
            ORDER BY "embedding" <=> $1::vector
            LIMIT $3
        """, vector_str, repo_id, limit)

        return [dict(row) for row in rows]
    finally:
        await conn.close()