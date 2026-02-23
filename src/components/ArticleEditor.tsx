import React, { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, Link as LinkIcon, List, ListOrdered, Quote, Heading2, Heading3, Minus, Image as ImageIcon, RemoveFormatting } from 'lucide-react';
import { getArticleTiptapExtensions } from '../lib/tiptapSchema';
import { fileToCompressedDataUrl } from '../lib/imageCompress';

export type ArticleEditorValue = {
  json: JSONContent;
  html: string;
  text: string;
};

export function ArticleEditor({
  value,
  onChange,
  placeholder = '请输入文章正文内容…',
}: {
  value?: JSONContent | null;
  onChange?: (v: ArticleEditorValue) => void;
  placeholder?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extensions = useMemo(() => getArticleTiptapExtensions(), []);

  const editor = useEditor({
    extensions,
    content: value ?? undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-purple max-w-none focus:outline-none min-h-[240px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      const text = editor.getText();
      onChange?.({ json, html, text });
    },
  });

  // When `value` changes from parent, sync once (avoid stomping local typing).
  useEffect(() => {
    if (!editor) return;
    if (!value) return;
    const current = editor.getJSON();
    // cheap compare: stringify (ok for this scale)
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const insertImageFromFile = async (file: File) => {
    // Static GitHub Pages MVP: store as base64 DataURL.
    // IMPORTANT: localStorage has strict size limits (often ~5MB). We must compress.
    const dataUrl = await fileToCompressedDataUrl(file, {
      maxWidth: 1600,
      maxHeight: 1600,
      mimeType: 'image/webp',
      quality: 0.82,
    });

    editor?.chain().focus().setImage({ src: dataUrl }).run();
  };

  const promptLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('输入链接 URL', previousUrl ?? '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) {
    return (
      <div className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500">
        编辑器加载中…
      </div>
    );
  }

  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('heading', { level: 2 }) ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="标题 H2"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('heading', { level: 3 }) ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="标题 H3"
        >
          <Heading3 size={16} />
        </button>
        <span className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('bold') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="加粗"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('italic') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="斜体"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('underline') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="下划线"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('strike') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="删除线"
        >
          <Strikethrough size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('highlight') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="高亮"
        >
          <Highlighter size={16} />
        </button>
        <button
          type="button"
          onClick={promptLink}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('link') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="链接"
        >
          <LinkIcon size={16} />
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('bulletList') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="无序列表"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('orderedList') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="有序列表"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded hover:bg-white border ${editor.isActive('blockquote') ? 'bg-white border-purple-300' : 'border-transparent'}`}
          title="引用"
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-2 py-1 rounded hover:bg-white border border-transparent"
          title="分割线"
        >
          <Minus size={16} />
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded hover:bg-white border border-transparent"
          title="插入图片"
        >
          <ImageIcon size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="上传图片文件"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await insertImageFromFile(file);
            e.currentTarget.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className="px-2 py-1 rounded hover:bg-white border border-transparent"
          title="清除格式"
        >
          <RemoveFormatting size={16} />
        </button>
      </div>

      <div className="bg-white">
        <div className="text-xs text-gray-400 px-4 pt-3">{placeholder}</div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
