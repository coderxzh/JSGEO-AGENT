import base64
import hashlib
import json
import math
import re
import shutil
import uuid
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterable, Optional

from agent_core.db import (
    add_knowledge_entry,
    create_connection,
    create_knowledge_asset,
    get_knowledge_asset,
    list_knowledge_assets,
    list_knowledge_entries,
    update_knowledge_asset_status,
    update_knowledge_entry_embedding_status,
)
from agent_core.knowledge_service import (
    build_knowledge_context,
    rebuild_enterprise_profile_from_document,
    rebuild_enterprise_profile_from_mapping,
    row_to_knowledge_entry,
)
from agent_core.llm_gateway import LLMGateway, ProviderRequestError
from agent_core.schemas import (
    KnowledgeAsset,
    KnowledgeAssetCreateRequest,
    KnowledgeAssetResponse,
    KnowledgeIndexStatusResponse,
    KnowledgeRetrievalResult,
)


EMBEDDING_MODEL = "BAAI/bge-small-zh-v1.5"
EMBEDDING_DIMENSION = 512
CHUNK_SIZE = 900
CHUNK_OVERLAP = 120


def safe_project_table_name(project_id: str) -> str:
    digest = hashlib.sha1(project_id.encode("utf-8")).hexdigest()[:16]
    return f"enterprise_{digest}"


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    chunks = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        chunks.append(normalized[start:end])
        if end >= len(normalized):
            break
        start = max(0, end - overlap)
    return chunks


class LocalEmbedder:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.model_name = EMBEDDING_MODEL
        self._fastembed_model = None

    @property
    def backend_name(self) -> str:
        return "fastembed" if self._fastembed_model is not None else "deterministic-local"

    def embed(self, texts: Iterable[str]) -> list[list[float]]:
        text_list = list(texts)
        model = self._load_fastembed()
        if model:
            return [list(vector) for vector in model.embed(text_list)]
        return [self._hash_embedding(text) for text in text_list]

    def _load_fastembed(self):
        if self._fastembed_model is not None:
            return self._fastembed_model
        try:
            from fastembed import TextEmbedding
        except Exception:
            return None
        cache_dir = self.data_dir / "models" / "fastembed"
        cache_dir.mkdir(parents=True, exist_ok=True)
        try:
            self._fastembed_model = TextEmbedding(
                model_name=EMBEDDING_MODEL,
                cache_dir=str(cache_dir),
            )
        except Exception:
            self._fastembed_model = None
        return self._fastembed_model

    def _hash_embedding(self, text: str) -> list[float]:
        vector = [0.0] * EMBEDDING_DIMENSION
        tokens = re.findall(r"[\w\u4e00-\u9fff]+", text.lower())
        if not tokens:
            tokens = [text]
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            for offset in range(0, len(digest), 2):
                index = int.from_bytes(digest[offset:offset + 2], "big") % EMBEDDING_DIMENSION
                vector[index] += 1.0
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]


class VectorStore:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.vector_dir = data_dir / "vectors" / "lancedb"
        self.vector_dir.mkdir(parents=True, exist_ok=True)
        self._db = None

    @property
    def backend_name(self) -> str:
        return "lancedb" if self._connect_lancedb() else "json-fallback"

    def replace_project(self, project_id: str, records: list[dict]) -> None:
        if self._connect_lancedb():
            table_name = safe_project_table_name(project_id)
            if records:
                self._db.create_table(table_name, data=records, mode="overwrite")
            else:
                self.drop_project(project_id)
            return
        path = self._fallback_path(project_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")

    def drop_project(self, project_id: str) -> None:
        if self._connect_lancedb():
            table_name = safe_project_table_name(project_id)
            try:
                self._db.drop_table(table_name)
            except Exception:
                pass
            return
        path = self._fallback_path(project_id)
        if path.exists():
            path.unlink()

    def search(self, project_id: str, vector: list[float], limit: int = 6) -> list[dict]:
        if self._connect_lancedb():
            table_name = safe_project_table_name(project_id)
            try:
                table = self._db.open_table(table_name)
                return table.search(vector).limit(limit).to_list()
            except Exception:
                return []
        path = self._fallback_path(project_id)
        if not path.exists():
            return []
        records = json.loads(path.read_text(encoding="utf-8"))
        scored = []
        for record in records:
            score = cosine_similarity(vector, record.get("vector") or [])
            scored.append({**record, "_distance": 1 - score})
        scored.sort(key=lambda item: item["_distance"])
        return scored[:limit]

    def _connect_lancedb(self):
        if self._db is not None:
            return self._db
        try:
            import lancedb
        except Exception:
            return None
        try:
            self._db = lancedb.connect(str(self.vector_dir))
        except Exception:
            self._db = None
        return self._db

    def _fallback_path(self, project_id: str) -> Path:
        return self.vector_dir / f"{safe_project_table_name(project_id)}.json"


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left)) or 1.0
    right_norm = math.sqrt(sum(b * b for b in right)) or 1.0
    return dot / (left_norm * right_norm)


class RAGService:
    def __init__(self, data_dir: Path, llm_gateway: Optional[LLMGateway] = None) -> None:
        self.data_dir = data_dir
        self.llm_gateway = llm_gateway
        self.embedder = LocalEmbedder(data_dir)
        self.vector_store = VectorStore(data_dir)

    def index_project(self, project_id: str) -> KnowledgeIndexStatusResponse:
        rows = list_knowledge_entries(self.data_dir, project_id, limit=200)
        records = []
        try:
            vectors = self.embedder.embed([row["content"] for row in rows])
            for row, vector in zip(rows, vectors):
                records.append({
                    "id": row["id"],
                    "project_id": row["project_id"] or "",
                    "title": row["title"] or "",
                    "content": row["content"] or "",
                    "source_type": row["source_type"] or "",
                    "metadata": row["metadata"] or "{}",
                    "vector": vector,
                })
                update_knowledge_entry_embedding_status(self.data_dir, row["id"], "indexed")
            self.vector_store.replace_project(project_id, records)
        except Exception as error:
            message = str(error)
            for row in rows:
                update_knowledge_entry_embedding_status(self.data_dir, row["id"], "failed", message)
        return self.index_status(project_id)

    def index_entries(self, project_id: Optional[str], entry_ids: Iterable[str]) -> None:
        if not project_id:
            return
        # Replacing the project table keeps deletions/edits consistent and is cheap for v1 scale.
        self.index_project(project_id)

    def search(self, project_id: Optional[str], query: str, limit: int = 6) -> list[KnowledgeRetrievalResult]:
        if not project_id or not query.strip():
            return []
        vector = self.embedder.embed([query])[0]
        records = self.vector_store.search(project_id, vector, limit=limit)
        return [
            KnowledgeRetrievalResult(
                id=record.get("id") or "",
                project_id=record.get("project_id") or project_id,
                title=record.get("title") or "",
                content=record.get("content") or "",
                source_type=record.get("source_type") or "",
                score=max(0.0, 1.0 - float(record.get("_distance") or 0.0)),
                metadata=parse_metadata(record.get("metadata")),
            )
            for record in records
        ]

    def retrieval_context(self, project_id: Optional[str], query: str, limit: int = 6) -> str:
        results = self.search(project_id, query, limit)
        rows = [
            {
                "title": result.title,
                "content": result.content,
            }
            for result in results
        ]
        return build_knowledge_context(rows)

    def save_asset(self, payload: KnowledgeAssetCreateRequest) -> KnowledgeAssetResponse:
        if not payload.project_id:
            raise ValueError("project_id is required")
        assets_dir = self.data_dir / "knowledge_assets" / payload.project_id
        assets_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(payload.filename).suffix.lower()
        filename = f"{uuid.uuid4()}{suffix}"
        file_path = assets_dir / filename
        file_bytes = base64.b64decode(payload.content_base64)
        file_path.write_bytes(file_bytes)
        asset_id = create_knowledge_asset(
            self.data_dir,
            project_id=payload.project_id,
            filename=payload.filename,
            content_type=payload.content_type,
            file_path=str(file_path),
        )
        try:
            entries = self.ingest_asset(asset_id)
        except Exception as error:
            update_knowledge_asset_status(self.data_dir, asset_id, "failed", str(error))
            asset_row = get_knowledge_asset(self.data_dir, asset_id)
            return KnowledgeAssetResponse(
                asset=row_to_asset(asset_row),
                entries=[],
                total=0,
            )
        asset_row = get_knowledge_asset(self.data_dir, asset_id)
        return KnowledgeAssetResponse(
            asset=row_to_asset(asset_row),
            entries=entries,
            total=len(entries),
        )

    def register_existing_asset(
        self,
        project_id: str,
        filename: str,
        content_type: Optional[str],
        file_path: Path,
    ) -> str:
        return create_knowledge_asset(
            self.data_dir,
            project_id=project_id,
            filename=filename,
            content_type=content_type,
            file_path=str(file_path),
        )

    def ingest_asset(self, asset_id: str, rebuild_profile: bool = True) -> list[dict]:
        asset = get_knowledge_asset(self.data_dir, asset_id)
        if asset is None:
            raise ValueError("Knowledge asset not found")
        text = extract_document_text(Path(asset["file_path"]), asset["content_type"])
        chunks = chunk_text(text)
        if not chunks:
            raise ValueError("文档未解析到可入库文本")
        update_knowledge_asset_status(self.data_dir, asset_id, "processing")
        entry_ids = []
        for index, chunk in enumerate(chunks):
            entry_id = add_knowledge_entry(
                self.data_dir,
                project_id=asset["project_id"],
                parent_id=asset_id,
                title=f"{asset['filename']} - 片段 {index + 1}",
                content=chunk,
                source_type="document",
                metadata=json.dumps({"asset_id": asset_id, "filename": asset["filename"]}, ensure_ascii=False),
                chunk_index=index,
            )
            entry_ids.append(entry_id)
        if rebuild_profile:
            self.rebuild_enterprise_profile(asset["project_id"], text)
        self.index_entries(asset["project_id"], entry_ids)
        self.index_project(asset["project_id"])
        update_knowledge_asset_status(self.data_dir, asset_id, "indexed")
        rows = list_knowledge_entries(self.data_dir, asset["project_id"], limit=200)
        return [row_to_knowledge_entry(row) for row in rows if row["parent_id"] == asset_id]

    def rebuild_enterprise_profile(self, project_id: str, text: str) -> None:
        if self.llm_gateway is not None:
            try:
                structured = self.llm_gateway.extract_enterprise_profile(text)
            except ProviderRequestError:
                structured = None
            if structured:
                rebuild_enterprise_profile_from_mapping(self.data_dir, project_id, structured)
                return
        rebuild_enterprise_profile_from_document(self.data_dir, project_id, text)

    def index_status(self, project_id: Optional[str]) -> KnowledgeIndexStatusResponse:
        entries = list_knowledge_entries(self.data_dir, project_id, limit=200)
        assets = list_knowledge_assets(self.data_dir, project_id)
        counts = {"pending": 0, "indexed": 0, "failed": 0}
        for entry in entries:
            status = entry["embedding_status"] or "pending"
            counts[status] = counts.get(status, 0) + 1
        return KnowledgeIndexStatusResponse(
            project_id=project_id,
            embedding_model=EMBEDDING_MODEL,
            vector_backend=self.vector_store.backend_name,
            embedding_backend=self.embedder.backend_name,
            pending=counts.get("pending", 0),
            indexed=counts.get("indexed", 0),
            failed=counts.get("failed", 0),
            asset_count=len(assets),
            assets=[row_to_asset(row) for row in assets],
        )

    def delete_project_index(self, project_id: str) -> None:
        self.vector_store.drop_project(project_id)
        assets_dir = self.data_dir / "knowledge_assets" / project_id
        if assets_dir.exists():
            shutil.rmtree(assets_dir, ignore_errors=True)


def extract_document_text(path: Path, content_type: Optional[str]) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf" or content_type == "application/pdf":
        return extract_pdf_text(path)
    if suffix in {".docx", ".doc"} or content_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    }:
        return extract_docx_text(path)
    return path.read_text(encoding="utf-8", errors="ignore")


def extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except Exception as error:
        raise RuntimeError("缺少 pypdf，无法解析 PDF") from error
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_docx_text(path: Path) -> str:
    try:
        from docx import Document
    except Exception:
        return extract_docx_text_from_zip(path)
    try:
        document = Document(str(path))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    except Exception:
        return extract_docx_text_from_zip(path)


def extract_docx_text_from_zip(path: Path) -> str:
    if path.suffix.lower() == ".doc":
        raise RuntimeError("暂不支持旧版 .doc 二进制 Word，请另存为 .docx 后上传。")
    try:
        with zipfile.ZipFile(path) as archive:
            document_xml = archive.read("word/document.xml")
    except Exception as error:
        raise RuntimeError("Word 文档解析失败，请确认文件为有效 .docx。") from error

    namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    root = ET.fromstring(document_xml)
    paragraphs = []
    for paragraph in root.findall(".//w:p", namespaces):
        texts = [node.text or "" for node in paragraph.findall(".//w:t", namespaces)]
        if texts:
            paragraphs.append("".join(texts))
    return "\n".join(paragraphs)


def parse_metadata(value) -> dict:
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value or "{}")
    except json.JSONDecodeError:
        return {}


def row_to_asset(row) -> KnowledgeAsset:
    return KnowledgeAsset(
        id=row["id"],
        project_id=row["project_id"],
        filename=row["filename"],
        content_type=row["content_type"],
        file_path=row["file_path"],
        source_type=row["source_type"],
        status=row["status"],
        error_message=row["error_message"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
