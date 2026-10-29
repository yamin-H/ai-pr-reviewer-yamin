from app.graph.review.state import ReviewState
from app.services.progress import report_progress
import re

async def chunk_changes(state: ReviewState) -> ReviewState:
    await report_progress(state['job_id'], 'chunk_changes', 'running', f"Chunking {len(state['changed_files'])} files")

    chunks = []
    for file in state['changed_files']:
        filename = file['filename']
        patch = file['patch']
        lines = patch.split('\n')

        current_chunk = []
        # Track both old file (LEFT) and new file (RIGHT) line numbers
        old_line = 0
        new_line = 0
        chunk_old_start = 0
        chunk_new_start = 0

        for line in lines:
            # Hunk header: @@ -old_start,old_count +new_start,new_count @@
            if line.startswith('@@'):
                if current_chunk:
                    chunks.append({
                        "filename": filename,
                        "content": '\n'.join(current_chunk),
                        "start_line": chunk_new_start,  # Primary: new file line
                        "end_line": new_line,
                        "old_start_line": chunk_old_start,  # For LEFT side context
                        "old_end_line": old_line,
                    })
                    current_chunk = []

                # Parse hunk header for both old and new line ranges
                # Format: @@ -10,5 +12,7 @@
                match = re.match(r'^@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@', line)
                if match:
                    old_start = int(match.group(1))
                    old_count = int(match.group(2)) if match.group(2) else 1
                    new_start = int(match.group(3))
                    new_count = int(match.group(4)) if match.group(4) else 1
                    
                    old_line = old_start
                    new_line = new_start
                    chunk_old_start = old_start
                    chunk_new_start = new_start
                else:
                    old_line = 0
                    new_line = 0
                    chunk_old_start = 0
                    chunk_new_start = 0
                
                current_chunk.append(line)

            elif line.startswith('+'):
                # Added line - only in new file (RIGHT side)
                current_chunk.append(line)
                new_line += 1
                if len(current_chunk) >= 30:
                    chunks.append({
                        "filename": filename,
                        "content": '\n'.join(current_chunk),
                        "start_line": chunk_new_start,
                        "end_line": new_line,
                        "old_start_line": chunk_old_start,
                        "old_end_line": old_line,
                    })
                    current_chunk = []
                    chunk_old_start = old_line
                    chunk_new_start = new_line

            elif line.startswith('-'):
                # Removed line - only in old file (LEFT side)
                current_chunk.append(line)
                old_line += 1
                if len(current_chunk) >= 30:
                    chunks.append({
                        "filename": filename,
                        "content": '\n'.join(current_chunk),
                        "start_line": chunk_new_start,
                        "end_line": new_line,
                        "old_start_line": chunk_old_start,
                        "old_end_line": old_line,
                    })
                    current_chunk = []
                    chunk_old_start = old_line
                    chunk_new_start = new_line

            elif line.startswith(' '):
                # Context line - in both files
                current_chunk.append(line)
                old_line += 1
                new_line += 1
                if len(current_chunk) >= 30:
                    chunks.append({
                        "filename": filename,
                        "content": '\n'.join(current_chunk),
                        "start_line": chunk_new_start,
                        "end_line": new_line,
                        "old_start_line": chunk_old_start,
                        "old_end_line": old_line,
                    })
                    current_chunk = []
                    chunk_old_start = old_line
                    chunk_new_start = new_line

        if current_chunk:
            chunks.append({
                "filename": filename,
                "content": '\n'.join(current_chunk),
                "start_line": chunk_new_start,
                "end_line": new_line,
                "old_start_line": chunk_old_start,
                "old_end_line": old_line,
            })

    print(f"[Node 2] Created {len(chunks)} chunks")
    await report_progress(state['job_id'], 'chunk_changes', 'completed', f"Created {len(chunks)} chunks")

    return {**state, "chunks": chunks}