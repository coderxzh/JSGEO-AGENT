from pathlib import Path
from typing import Any, Dict, List, Optional


def parse_skill_markdown(path: Path) -> Dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    metadata: Dict[str, str] = {}
    body = raw
    if raw.startswith("---\n"):
        end = raw.find("\n---", 4)
        if end != -1:
            frontmatter = raw[4:end].strip()
            body = raw[end + 4:].strip()
            for line in frontmatter.splitlines():
                if ":" not in line:
                    continue
                key, value = line.split(":", 1)
                metadata[key.strip()] = value.strip().strip('"').strip("'")

    return {
        "id": path.parent.name,
        "name": metadata.get("name") or path.parent.name,
        "description": metadata.get("description") or "",
        "visibility": metadata.get("visibility") or "internal",
        "path": str(path),
        "content": body.strip(),
    }


def list_skills(project_root: Path, *, include_internal: bool = False) -> List[Dict[str, Any]]:
    skills_dir = project_root / ".skills"
    if not skills_dir.exists():
        return []

    skills = []
    for path in sorted(skills_dir.glob("*/SKILL.md")):
        skill = parse_skill_markdown(path)
        if include_internal or skill.get("visibility") == "user":
            skills.append(skill)
    return skills


def get_skill(project_root: Path, skill_id: str) -> Optional[Dict[str, Any]]:
    if not skill_id or "/" in skill_id or "\\" in skill_id:
        return None
    path = project_root / ".skills" / skill_id / "SKILL.md"
    if not path.exists():
        return None
    return parse_skill_markdown(path)
