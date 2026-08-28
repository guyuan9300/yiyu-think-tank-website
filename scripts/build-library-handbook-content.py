#!/usr/bin/env python3
"""Convert the 11 handbook DOCX files into chapter-sized, read-only web content.

The generated bundle contains escaped HTML fragments inside JSON.  It preserves
body order, selectable text, lists, tables, captions, hyperlinks, footnotes and
the images actually referenced by the Word document body.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
from collections import Counter
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable
from urllib.parse import urlparse
from zipfile import ZipFile

from lxml import etree
from PIL import Image


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
PR = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"w": W, "r": R, "a": A, "wp": WP, "pr": PR}


BOOK_META = [
    {"number": "总", "label": "总纲", "title": "拟建公共图书馆建设与可持续运营体系", "short": "使用总指引", "question": "从建设决策到持续运营，一套手册如何协同工作？", "description": "以公共价值为起点，统筹建设、治理、服务、资源、数字、安全、财务与评估，让图书馆从开馆之初就具备长期运营能力。", "keywords": ["建设决策", "开馆筹备", "长期运营", "知识库与工具"]},
    {"number": "一", "label": "第一册", "title": "总体运营与治理指引", "short": "使命、治理与年度闭环", "question": "如何让图书馆的使命、权责与日常行动保持一致？", "description": "建立面向公共价值的治理结构、职责边界与年度运行节奏，让每项新增事项都能被判断、执行和复盘。", "keywords": ["使命", "治理", "权责", "年度计划"]},
    {"number": "二", "label": "第二册", "title": "建设与运营衔接指引", "short": "从空间交付到可运营", "question": "怎样避免“建得漂亮，却不好运营”？", "description": "把运营需求前置到规划、设计、施工、验收与移交全过程，以真实使用场景检验空间和设施。", "keywords": ["建设", "运营前置", "空间", "移交"]},
    {"number": "三", "label": "第三册", "title": "组织架构岗位与人员管理指引", "short": "让组织真正运转", "question": "岗位、人员和协作机制如何匹配服务目标？", "description": "从工作任务出发配置组织、岗位与能力，形成可协作、可培训、可评价的人力运行体系。", "keywords": ["组织", "岗位", "能力", "协作"]},
    {"number": "四", "label": "第四册", "title": "馆藏资源建设与图书业务指引", "short": "让资源回应真实需求", "question": "如何构建兼顾地方使命、专业判断与使用数据的馆藏？", "description": "用读者需求、地方使命、专业判断和使用数据共同支持馆藏决策，建立持续更新的资源体系。", "keywords": ["馆藏政策", "资源建设", "流通", "评估"]},
    {"number": "五", "label": "第五册", "title": "读者服务与场馆日常运营指引", "short": "把服务落实到现场", "question": "怎样让每一次到馆都稳定、友好且有回应？", "description": "围绕读者旅程组织开放、咨询、借阅、空间与特殊人群服务，形成稳定清晰的现场标准。", "keywords": ["读者服务", "开放", "现场", "服务改进"]},
    {"number": "六", "label": "第六册", "title": "设施物业安全与突发事件指引", "short": "守住稳定运行底线", "question": "设施、安全与应急如何成为一套日常机制？", "description": "把设施维护、物业协作、风险巡查与突发事件响应连接起来，保护人员、资产与服务连续性。", "keywords": ["设施", "物业", "安全", "应急"]},
    {"number": "七", "label": "第七册", "title": "数字系统数据与信息安全指引", "short": "以数据支持服务", "question": "数字化如何真正支持读者、业务与管理？", "description": "建立适度、可靠、可维护的数字系统与数据治理框架，在提升服务的同时守住信息安全边界。", "keywords": ["数字系统", "数据治理", "数字服务", "信息安全"]},
    {"number": "八", "label": "第八册", "title": "公共服务活动与合作项目指引", "short": "让活动产生公共价值", "question": "活动与合作如何从“热闹一次”走向长期价值？", "description": "以公共需求为依据设计活动与合作项目，建立策划、执行、风险与评估的完整项目机制。", "keywords": ["公共活动", "项目", "合作", "评估"]},
    {"number": "九", "label": "第九册", "title": "财务资产采购与可持续运营指引", "short": "让资源配置可持续", "question": "怎样用有限资源稳定支持公共服务？", "description": "从稳定基本保障、完整成本预算到规范采购资产、社会资源和审慎经营，建立可追溯的资源配置机制。", "keywords": ["财务", "预算", "采购", "资产"]},
    {"number": "十", "label": "第十册", "title": "运营评估年度报告与持续改进指引", "short": "用证据推动改进", "question": "如何把评估变成组织持续学习的工具？", "description": "用指标、证据、年度报告和改进机制连接目标与行动，让经验得以积累，让问题获得回应。", "keywords": ["评估", "指标", "年度报告", "持续改进"]},
]


def q(namespace: str, local: str) -> str:
    return f"{{{namespace}}}{local}"


def compact_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def clean_text(value: str) -> str:
    return re.sub(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f]", "", value)


def safe_href(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme.lower() in {"http", "https", "mailto"}:
        return html.escape(value, quote=True)
    return ""


def paragraph_plain(node: etree._Element) -> str:
    parts: list[str] = []
    for item in node.iter():
        if item.tag == q(W, "t"):
            parts.append(item.text or "")
        elif item.tag == q(W, "tab"):
            parts.append("\t")
        elif item.tag in {q(W, "br"), q(W, "cr")}:
            parts.append("\n")
        elif item.tag == q(W, "noBreakHyphen"):
            parts.append("‑")
        elif item.tag == q(W, "softHyphen"):
            parts.append("\u00ad")
    return clean_text("".join(parts)).strip()


def iter_word_blocks(parent: etree._Element) -> Iterable[etree._Element]:
    for child in parent:
        if child.tag in {q(W, "p"), q(W, "tbl")}:
            yield child
        elif child.tag in {q(W, "sdt"), q(W, "customXml")}:
            for nested in child.xpath("./w:sdtContent/* | ./*[not(self::w:sdtPr)]", namespaces=NS):
                if nested.tag in {q(W, "p"), q(W, "tbl")}:
                    yield nested


@dataclass
class StyleInfo:
    name: str
    based_on: str
    num_id: str


class DocxConverter:
    def __init__(self, source: Path, out_root: Path, book_id: str):
        self.source = source
        self.out_root = out_root
        self.book_id = book_id
        self.archive = ZipFile(source)
        self.document = etree.fromstring(self.archive.read("word/document.xml"))
        self.relationships = self._relationships("word/_rels/document.xml.rels")
        self.styles = self._styles()
        self.number_formats = self._number_formats()
        self.notes = self._notes()
        self.media_cache: dict[str, dict] = {}
        self.media_occurrences = 0

    def close(self) -> None:
        self.archive.close()

    def _relationships(self, member: str) -> dict[str, dict[str, str]]:
        if member not in self.archive.namelist():
            return {}
        root = etree.fromstring(self.archive.read(member))
        result = {}
        for rel in root.xpath("./pr:Relationship", namespaces=NS):
            result[rel.get("Id", "")] = {
                "target": rel.get("Target", ""),
                "mode": rel.get("TargetMode", ""),
                "type": rel.get("Type", ""),
            }
        return result

    def _styles(self) -> dict[str, StyleInfo]:
        root = etree.fromstring(self.archive.read("word/styles.xml"))
        result: dict[str, StyleInfo] = {}
        for style in root.xpath(".//w:style[@w:type='paragraph']", namespaces=NS):
            style_id = style.get(q(W, "styleId"), "")
            result[style_id] = StyleInfo(
                name="".join(style.xpath("./w:name/@w:val", namespaces=NS)),
                based_on="".join(style.xpath("./w:basedOn/@w:val", namespaces=NS)),
                num_id="".join(style.xpath("./w:pPr/w:numPr/w:numId/@w:val", namespaces=NS)),
            )
        return result

    def _number_formats(self) -> dict[str, str]:
        if "word/numbering.xml" not in self.archive.namelist():
            return {}
        root = etree.fromstring(self.archive.read("word/numbering.xml"))
        abstracts: dict[str, str] = {}
        for item in root.xpath("./w:abstractNum", namespaces=NS):
            abstract_id = item.get(q(W, "abstractNumId"), "")
            fmt = "".join(item.xpath("./w:lvl[@w:ilvl='0']/w:numFmt/@w:val", namespaces=NS))
            abstracts[abstract_id] = fmt
        result: dict[str, str] = {}
        for item in root.xpath("./w:num", namespaces=NS):
            num_id = item.get(q(W, "numId"), "")
            abstract_id = "".join(item.xpath("./w:abstractNumId/@w:val", namespaces=NS))
            result[num_id] = abstracts.get(abstract_id, "")
        return result

    def _notes(self) -> list[dict]:
        notes: list[dict] = []
        for kind, member, tag in (
            ("脚注", "word/footnotes.xml", "footnote"),
            ("尾注", "word/endnotes.xml", "endnote"),
        ):
            if member not in self.archive.namelist():
                continue
            root = etree.fromstring(self.archive.read(member))
            for note in root.xpath(f"./w:{tag}", namespaces=NS):
                note_id = int(note.get(q(W, "id"), "-1"))
                if note_id < 0:
                    continue
                text = " ".join(filter(None, (paragraph_plain(p) for p in note.xpath(".//w:p", namespaces=NS))))
                if text:
                    notes.append({"kind": kind, "id": note_id, "text": text})
        return notes

    def style_name(self, paragraph: etree._Element) -> str:
        style_id = "".join(paragraph.xpath("./w:pPr/w:pStyle/@w:val", namespaces=NS))
        info = self.styles.get(style_id)
        return (info.name if info else style_id).strip()

    def heading_level(self, paragraph: etree._Element) -> int:
        style_id = "".join(paragraph.xpath("./w:pPr/w:pStyle/@w:val", namespaces=NS))
        info = self.styles.get(style_id)
        candidates = [style_id, info.name if info else ""]
        if info and info.based_on:
            parent = self.styles.get(info.based_on)
            candidates.extend([info.based_on, parent.name if parent else ""])
        value = " ".join(candidates)
        match = re.search(r"(?:heading|标题)\s*([1-6])", value, re.I)
        if match:
            return int(match.group(1))
        outline = "".join(paragraph.xpath("./w:pPr/w:outlineLvl/@w:val", namespaces=NS))
        if outline.isdigit() and int(outline) < 6:
            return int(outline) + 1
        return 0

    def list_kind(self, paragraph: etree._Element) -> str:
        style_id = "".join(paragraph.xpath("./w:pPr/w:pStyle/@w:val", namespaces=NS))
        style = self.styles.get(style_id)
        name = (style.name if style else style_id).lower()
        num_id = "".join(paragraph.xpath("./w:pPr/w:numPr/w:numId/@w:val", namespaces=NS))
        if not num_id and style:
            num_id = style.num_id
        fmt = self.number_formats.get(num_id, "")
        if "bullet" in name or fmt == "bullet":
            return "unordered"
        if "list" in name or num_id:
            return "ordered"
        return ""

    def run_html(self, run: etree._Element) -> str:
        pieces: list[str] = []
        for item in run.iter():
            if item.tag == q(W, "t"):
                pieces.append(html.escape(clean_text(item.text or "")))
            elif item.tag == q(W, "tab"):
                pieces.append('<span class="tab">\t</span>')
            elif item.tag in {q(W, "br"), q(W, "cr")}:
                pieces.append("<br>")
            elif item.tag == q(W, "noBreakHyphen"):
                pieces.append("‑")
            elif item.tag == q(W, "softHyphen"):
                pieces.append("&shy;")
            elif item.tag == q(W, "footnoteReference"):
                note_id = item.get(q(W, "id"), "")
                pieces.append(f'<sup class="note-ref">〔注{html.escape(note_id)}〕</sup>')
            elif item.tag == q(W, "endnoteReference"):
                note_id = item.get(q(W, "id"), "")
                pieces.append(f'<sup class="note-ref">〔尾注{html.escape(note_id)}〕</sup>')
        value = "".join(pieces)
        if not value:
            return ""
        props = run.find(q(W, "rPr"))
        if props is not None:
            if props.find(q(W, "b")) is not None:
                value = f"<strong>{value}</strong>"
            if props.find(q(W, "i")) is not None:
                value = f"<em>{value}</em>"
            if props.find(q(W, "u")) is not None:
                value = f"<u>{value}</u>"
        return value

    def inline_html(self, paragraph: etree._Element) -> str:
        def convert(node: etree._Element) -> str:
            if node.tag == q(W, "r"):
                return self.run_html(node)
            children = "".join(convert(child) for child in node)
            if node.tag == q(W, "hyperlink"):
                rel_id = node.get(q(R, "id"), "")
                anchor = node.get(q(W, "anchor"), "")
                target = self.relationships.get(rel_id, {}).get("target", "")
                href = safe_href(target)
                if href:
                    return f'<a href="{href}" target="_blank" rel="noopener noreferrer">{children}</a>'
                if anchor:
                    return f'<span class="internal-link">{children}</span>'
            return children

        return "".join(convert(child) for child in paragraph)

    def paragraph_classes(self, paragraph: etree._Element) -> list[str]:
        classes: list[str] = []
        style = self.style_name(paragraph).lower()
        if "caption" in style or "题注" in style:
            classes.append("caption")
        if "quote" in style or "引用" in style:
            classes.append("quote")
        if "small" in style:
            classes.append("small")
        align = "".join(paragraph.xpath("./w:pPr/w:jc/@w:val", namespaces=NS))
        if align in {"center", "right", "justify"}:
            classes.append(f"align-{align}")
        sizes = [int(value) / 2 for value in paragraph.xpath(".//w:rPr/w:sz/@w:val", namespaces=NS) if value.isdigit()]
        if self.heading_level(paragraph) == 0 and sizes:
            if max(sizes) >= 22:
                classes.append("lead-title")
            elif max(sizes) >= 14:
                classes.append("lead-subtitle")
        if paragraph.xpath("./w:pPr/w:shd", namespaces=NS):
            classes.append("callout")
        return classes

    def media_from(self, node: etree._Element) -> list[dict]:
        result: list[dict] = []
        for blip in node.xpath(".//a:blip[@r:embed]", namespaces=NS):
            rel_id = blip.get(q(R, "embed"), "")
            rel = self.relationships.get(rel_id)
            if not rel:
                continue
            target = rel["target"]
            archive_path = str(PurePosixPath("word") / target)
            archive_path = str(PurePosixPath(archive_path))
            if archive_path not in self.archive.namelist():
                continue
            data = self.archive.read(archive_path)
            digest = hashlib.sha256(data).hexdigest()
            if digest not in self.media_cache:
                suffix = Path(target).suffix.lower() or ".png"
                filename = f"{digest[:16]}{suffix}"
                destination = self.out_root / "media" / self.book_id / filename
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
                with Image.open(destination) as image:
                    width, height = image.size
                self.media_cache[digest] = {
                    "src": f"media/{self.book_id}/{filename}",
                    "width": width,
                    "height": height,
                    "sha256": digest,
                }
            doc_props = blip.xpath("ancestor::w:drawing[1]//wp:docPr[1]", namespaces=NS)
            alt = ""
            if doc_props:
                prop = doc_props[0]
                alt = prop.get("descr") or prop.get("title") or prop.get("name") or ""
            item = dict(self.media_cache[digest])
            item["alt"] = clean_text(alt) or "手册插图"
            result.append(item)
            self.media_occurrences += 1
        return result

    def paragraph_blocks(self, paragraph: etree._Element) -> list[dict]:
        text = paragraph_plain(paragraph)
        images = self.media_from(paragraph)
        blocks: list[dict] = []
        level = self.heading_level(paragraph)
        content = self.inline_html(paragraph)
        if text or content:
            if level:
                blocks.append({"type": "heading", "level": level, "html": content, "text": text})
            else:
                list_kind = self.list_kind(paragraph)
                if list_kind:
                    blocks.append({"type": "list_item", "ordered": list_kind == "ordered", "html": content, "text": text})
                else:
                    blocks.append({"type": "paragraph", "html": content, "text": text, "classes": self.paragraph_classes(paragraph)})
        for image in images:
            blocks.append({"type": "image", **image})
        return blocks

    def cell_html(self, cell: etree._Element) -> tuple[str, str, int]:
        pieces: list[str] = []
        texts: list[str] = []
        image_count = 0
        for child in iter_word_blocks(cell):
            if child.tag == q(W, "p"):
                for block in self.paragraph_blocks(child):
                    if block["type"] == "image":
                        ratio = block["width"] / max(1, block["height"])
                        pieces.append(f'<img loading="lazy" decoding="async" src="./content/{html.escape(block["src"], quote=True)}" alt="{html.escape(block["alt"], quote=True)}" width="{block["width"]}" height="{block["height"]}" style="aspect-ratio:{ratio:.6f}">')
                        image_count += 1
                    elif block["type"] == "heading":
                        pieces.append(f'<p class="cell-heading">{block["html"]}</p>')
                        texts.append(block["text"])
                    elif block["type"] == "list_item":
                        pieces.append(f'<p class="cell-list-item">{block["html"]}</p>')
                        texts.append(block["text"])
                    else:
                        classes = " ".join(block.get("classes", []))
                        pieces.append(f'<p class="{html.escape(classes, quote=True)}">{block["html"]}</p>')
                        texts.append(block["text"])
            elif child.tag == q(W, "tbl"):
                nested = self.table_block(child)
                pieces.append(nested["html"])
                texts.append(nested["text"])
                image_count += nested["images"]
        return "".join(pieces), "\n".join(filter(None, texts)), image_count

    def table_block(self, table: etree._Element) -> dict:
        rows: list[str] = []
        table_texts: list[str] = []
        image_count = 0
        first_row_header = bool(table.xpath("./w:tblPr/w:tblLook[@w:firstRow='1']", namespaces=NS))
        for row_index, row in enumerate(table.xpath("./w:tr", namespaces=NS)):
            cells: list[str] = []
            for cell in row.xpath("./w:tc", namespaces=NS):
                cell_content, cell_text, cell_images = self.cell_html(cell)
                span = "".join(cell.xpath("./w:tcPr/w:gridSpan/@w:val", namespaces=NS))
                colspan = f' colspan="{int(span)}"' if span.isdigit() and int(span) > 1 else ""
                tag = "th" if first_row_header and row_index == 0 else "td"
                cells.append(f"<{tag}{colspan}>{cell_content}</{tag}>")
                table_texts.append(cell_text)
                image_count += cell_images
            rows.append(f"<tr>{''.join(cells)}</tr>")
        return {
            "type": "table",
            "html": f'<div class="table-scroll"><table><tbody>{"".join(rows)}</tbody></table></div>',
            "text": "\n".join(filter(None, table_texts)),
            "images": image_count,
        }

    @staticmethod
    def append_block(blocks: list[dict], block: dict) -> None:
        if block["type"] == "list_item":
            ordered = block.pop("ordered")
            if blocks and blocks[-1]["type"] == "list" and blocks[-1]["ordered"] == ordered:
                blocks[-1]["items"].append({"html": block["html"], "text": block["text"]})
                blocks[-1]["text"] += "\n" + block["text"]
            else:
                blocks.append({"type": "list", "ordered": ordered, "items": [{"html": block["html"], "text": block["text"]}], "text": block["text"]})
        else:
            blocks.append(block)

    def convert(self, meta: dict) -> tuple[dict, list[dict], dict]:
        body = self.document.find(q(W, "body"))
        assert body is not None
        sections: list[dict] = []
        current = {"id": "front-matter", "title": "封面与编制信息", "blocks": [], "source": []}
        source_stream: list[str] = []

        def finish_section() -> None:
            nonlocal current
            if not current["blocks"] and not current["source"]:
                return
            current["index"] = len(sections)
            current["characters"] = sum(len(item) for item in current["source"])
            current["tables"] = sum(1 for block in current["blocks"] if block["type"] == "table")
            current["images"] = sum(1 for block in current["blocks"] if block["type"] == "image") + sum(block.get("images", 0) for block in current["blocks"] if block["type"] == "table")
            current.pop("source", None)
            sections.append(current)

        for child in iter_word_blocks(body):
            if child.tag == q(W, "p"):
                text = paragraph_plain(child)
                blocks = self.paragraph_blocks(child)
                level = self.heading_level(child)
                split_large_section = level == 2 and text and sum(len(item) for item in current["source"]) >= 18000
                if (level == 1 or split_large_section) and text:
                    finish_section()
                    current = {"id": f"section-{len(sections) + 1:03d}", "title": text, "blocks": [], "source": [text]}
                    source_stream.append(text)
                    for block in blocks:
                        if block["type"] == "image":
                            self.append_block(current["blocks"], block)
                    continue
                if text:
                    current["source"].append(text)
                    source_stream.append(text)
                for block in blocks:
                    self.append_block(current["blocks"], block)
            elif child.tag == q(W, "tbl"):
                block = self.table_block(child)
                if block["text"]:
                    current["source"].append(block["text"])
                    source_stream.append(block["text"])
                self.append_block(current["blocks"], block)
        finish_section()

        if self.notes:
            note_blocks = [{"type": "note", **note} for note in self.notes]
            sections.append({
                "id": "notes",
                "title": "注释与尾注",
                "index": len(sections),
                "blocks": note_blocks,
                "characters": sum(len(note["text"]) for note in self.notes),
                "tables": 0,
                "images": 0,
            })

        book_manifest = {
            "id": self.book_id,
            **meta,
            "sourceName": self.source.name,
            "sections": [],
            "characters": sum(len(item) for item in source_stream) + sum(len(note["text"]) for note in self.notes),
            "tables": sum(section["tables"] for section in sections),
            "images": sum(section["images"] for section in sections),
            "notes": len(self.notes),
        }
        section_payloads: list[dict] = []
        for section in sections:
            payload = dict(section)
            payload["bookId"] = self.book_id
            payload["bookTitle"] = meta["title"]
            section_payloads.append(payload)
            book_manifest["sections"].append({key: payload[key] for key in ("id", "title", "index", "characters", "tables", "images")})

        body_text_nodes = [clean_text(value).strip() for value in self.document.xpath(".//w:body//w:t/text()", namespaces=NS)]
        raw_body_characters = sum(len(value) for value in body_text_nodes)
        compact_source = re.sub(r"\s+", "", "".join(clean_text(value) for value in self.document.xpath(".//w:body//w:t/text()", namespaces=NS)))
        compact_stream = re.sub(r"\s+", "", "".join(source_stream))
        qa = {
            "id": self.book_id,
            "source": str(self.source),
            "rawBodyCharacters": raw_body_characters,
            "streamCharacters": sum(len(item) for item in source_stream),
            "contentSequenceMatches": compact_source == compact_stream,
            "sourceTextSha256": hashlib.sha256(compact_source.encode("utf-8")).hexdigest(),
            "outputTextSha256": hashlib.sha256(compact_stream.encode("utf-8")).hexdigest(),
            "noteCharacters": sum(len(note["text"]) for note in self.notes),
            "sections": len(sections),
            "tables": book_manifest["tables"],
            "imageOccurrences": self.media_occurrences,
            "uniqueImages": len(self.media_cache),
            "emptySections": [section["id"] for section in sections if not section["blocks"]],
        }
        return book_manifest, section_payloads, qa


def parse_mapping(path: Path) -> list[Path]:
    sources: list[Path] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        _, source = line.split("\t", 1)
        sources.append(Path(source))
    if len(sources) != len(BOOK_META):
        raise ValueError(f"Expected {len(BOOK_META)} DOCX files, found {len(sources)}")
    missing = [str(source) for source in sources if not source.is_file()]
    if missing:
        raise FileNotFoundError("Missing source files: " + ", ".join(missing))
    return sources


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--map", type=Path, required=True, help="TSV mapping whose second column is the DOCX path")
    parser.add_argument("--out", type=Path, required=True, help="Generated static content root")
    args = parser.parse_args()

    sources = parse_mapping(args.map)
    if args.out.exists():
        shutil.rmtree(args.out)
    args.out.mkdir(parents=True)

    root_manifest = {"version": 1, "format": "native-html", "books": [], "totals": {}}
    qa_report = {"books": [], "errors": []}
    for index, (source, meta) in enumerate(zip(sources, BOOK_META)):
        book_id = f"{index:02d}"
        converter = DocxConverter(source, args.out, book_id)
        try:
            book_manifest, section_payloads, qa = converter.convert(meta)
        finally:
            converter.close()
        book_dir = args.out / "books" / book_id
        for payload in section_payloads:
            compact_json(book_dir / "sections" / f'{payload["id"]}.json', payload)
        compact_json(book_dir / "manifest.json", book_manifest)
        root_manifest["books"].append({key: book_manifest[key] for key in (*BOOK_META[index].keys(), "id", "characters", "tables", "images", "notes", "sections")})
        qa_report["books"].append(qa)
        print(f'{book_id} {meta["label"]}: {len(section_payloads)} sections, {book_manifest["characters"]} chars, {book_manifest["tables"]} tables, {book_manifest["images"]} images')

    root_manifest["totals"] = {
        "books": len(root_manifest["books"]),
        "sections": sum(len(book["sections"]) for book in root_manifest["books"]),
        "characters": sum(book["characters"] for book in root_manifest["books"]),
        "tables": sum(book["tables"] for book in root_manifest["books"]),
        "images": sum(book["images"] for book in root_manifest["books"]),
        "notes": sum(book["notes"] for book in root_manifest["books"]),
    }
    qa_report["totals"] = root_manifest["totals"]
    qa_report["errors"] = [
        f'{book["id"]}: empty section {section}'
        for book in qa_report["books"]
        for section in book["emptySections"]
    ]
    qa_report["errors"].extend(
        f'{book["id"]}: body text sequence mismatch'
        for book in qa_report["books"]
        if not book["contentSequenceMatches"]
    )
    compact_json(args.out / "manifest.json", root_manifest)
    compact_json(args.out / "qa-report.json", qa_report)
    print(json.dumps(root_manifest["totals"], ensure_ascii=False))
    if qa_report["errors"]:
        raise SystemExit("QA failed: " + "; ".join(qa_report["errors"]))


if __name__ == "__main__":
    main()
