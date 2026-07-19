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

    # Note: Prisma creates tables and columns case-sensitive unless @map is used.
    # Therefore, we need to quote the table name and column names.
    await conn.execute("""
        INSERT INTO "MemoryEntry" 
        ("id", "orgId", "repoId", "content", "embedding", "decisionType", "outcome", "prNumber", "filePath")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, $5, $6, $7, $8)
    """, org_id, repo_id, content, vector_str, decision_type, outcome, pr_number, file_path)

    await conn.close()
    print(f"Stored decision for PR #{pr_number}: {content[:60]}...")


async def search_memory(
    repo_id: str,
    query: str,
    limit: int = 5
) -> list[dict]:
    """Search for similar past decisions using cosine similarity."""
    vector = embed(query)
    vector_str = "[" + ",".join(str(x) for x in vector) + "]"

    conn = await asyncpg.connect(DATABASE_URL)

    rows = await conn.fetch("""
        SELECT 
            "content",
            "decisionType" as decision_type,
            "outcome",
            "prNumber" as pr_number,
            "filePath" as file_path,
            1 - ("embedding" <=> $1::vector) as similarity
        FROM "MemoryEntry"
        WHERE "repoId" = $2
        ORDER BY "embedding" <=> $1::vector
        LIMIT $3
    """, vector_str, repo_id, limit)

    await conn.close()
    return [dict(row) for row in rows]