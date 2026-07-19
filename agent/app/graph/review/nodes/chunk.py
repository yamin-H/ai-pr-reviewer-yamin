from app.graph.review.state import ReviewState
from app.services.progress import report_progress

async def chunk_changes(state: ReviewState) -> ReviewState:
    await report_progress(state['job_id'], 'chunk_changes', 'running', f"Chunking {len(state['changed_files'])} files")

    chunks = []
    for file in state['changed_files']:
        filename = file['filename']
        patch = file['patch']
        lines = patch.split('\n')

        current_chunk = []
        current_start_line = 1
        real_line = 0

        for line in lines:
            if line.startswith('@@'):
                if current_chunk:
                    chunks.append({
                        "filename": filename,
                        "content": '\n'.join(current_chunk),
                        "start_line": current_start_line,
                        "end_line": real_line
                    })
                    current_chunk = []
                try:
                    parts = line.split('+')[1].split('@@')[0].strip()
                    real_line = int(parts.split(',')[0])
                    current_start_line = real_line
                except:
                    real_line = 0
                    current_start_line = 0
                current_chunk.append(line)
            elif line.startswith('+') or line.startswith('-') or line.startswith(' '):
                current_chunk.append(line)
                if not line.startswith('-'):
                    real_line += 1
                if len(current_chunk) >= 30:
                    chunks.append({
                        "filename": filename,
                        "content": '\n'.join(current_chunk),
                        "start_line": current_start_line,
                        "end_line": real_line
                    })
                    current_chunk = []
                    current_start_line = real_line

        if current_chunk:
            chunks.append({
                "filename": filename,
                "content": '\n'.join(current_chunk),
                "start_line": current_start_line,
                "end_line": real_line
            })

    print(f"[Node 2] Created {len(chunks)} chunks")
    await report_progress(state['job_id'], 'chunk_changes', 'completed', f"Created {len(chunks)} chunks")

    return {**state, "chunks": chunks}