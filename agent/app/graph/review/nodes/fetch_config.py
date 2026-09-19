import base64
import yaml
from github import GithubException
from app.graph.review.state import ReviewState
from app.services.github import get_github_client
from app.services.progress import report_progress

CONFIG_FILENAMES = [".powerful.yml", ".powerful.yaml"]

async def fetch_config(state: ReviewState) -> ReviewState:
    job_id = state.get("job_id", "unknown")
    repo_name = state.get("repo")
    installation_id = state.get("installation_id")
    head_sha = state.get("head_sha")

    print(f"[Node fetch_config] Checking for repository custom rules on {repo_name}")
    await report_progress(job_id, "fetch_config", "running", "Checking for custom rules in .powerful.yml...")

    custom_rules: list[str] = []
    found_filename: str | None = None

    if repo_name and installation_id:
        try:
            github_client = await get_github_client(installation_id)
            repo = github_client.get_repo(repo_name)

            for filename in CONFIG_FILENAMES:
                try:
                    # Query contents at PR head commit to inspect branch-specific rules
                    file_content = repo.get_contents(filename, ref=head_sha) if head_sha else repo.get_contents(filename)
                    if file_content and file_content.content:
                        raw_yaml = base64.b64decode(file_content.content).decode("utf-8")
                        parsed = yaml.safe_load(raw_yaml)
                        found_filename = filename

                        if isinstance(parsed, dict) and "rules" in parsed:
                            raw_list = parsed["rules"]
                            if isinstance(raw_list, list):
                                custom_rules = [str(r).strip() for r in raw_list if str(r).strip()]
                        elif isinstance(parsed, list):
                            custom_rules = [str(r).strip() for r in parsed if str(r).strip()]

                        print(f"[Node fetch_config] Successfully parsed {len(custom_rules)} rules from {filename}")
                        break
                except GithubException as ghe:
                    # 404 indicates file does not exist in repo root; continue checking next filename
                    if ghe.status == 404:
                        continue
                    else:
                        print(f"[Node fetch_config] GitHub error reading {filename}: {ghe}")
                except yaml.YAMLError as ye:
                    print(f"[Node fetch_config] Warning: Malformed YAML in {filename}: {ye}")
                    break
                except Exception as ex:
                    print(f"[Node fetch_config] Error processing {filename}: {ex}")
                    break
        except Exception as e:
            print(f"[Node fetch_config] Warning: Could not initialize GitHub client for config fetch: {e}")

    if custom_rules:
        status_msg = f"Enforcing {len(custom_rules)} custom rules loaded from {found_filename}"
    else:
        status_msg = "No .powerful.yml detected; using standard convention checks"

    await report_progress(
        job_id,
        "fetch_config",
        "completed",
        status_msg,
        {"rules_count": len(custom_rules), "rules": custom_rules, "config_file": found_filename}
    )

    return {
        **state,
        "custom_rules": custom_rules
    }
