import pytest
from unittest.mock import patch, AsyncMock
from app.graph.review.nodes.chunk import chunk_changes

@pytest.mark.asyncio
@patch("app.graph.review.nodes.chunk.report_progress", new_callable=AsyncMock)
async def test_chunk_changes_basic(mock_report):
    sample_patch = """@@ -1,5 +1,6 @@
 import os
+import sys

 def main():
-    print("hello")
+    print("hello world")
"""
    state = {
        "job_id": "test-job-123",
        "changed_files": [
            {
                "filename": "app/main.py",
                "patch": sample_patch,
                "additions": 2,
                "deletions": 1,
                "status": "modified"
            }
        ]
    }

    result = await chunk_changes(state)
    assert "chunks" in result
    chunks = result["chunks"]
    assert len(chunks) >= 1
    assert chunks[0]["filename"] == "app/main.py"
    assert "start_line" in chunks[0]
    assert "end_line" in chunks[0]
    mock_report.assert_called()
