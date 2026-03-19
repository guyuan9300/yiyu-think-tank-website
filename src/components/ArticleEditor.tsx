import React, { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, Link as LinkIcon, List, ListOrdered, Quote, Minus, Image as ImageIcon, RemoveFormatting } from 'lucide-react';
import { getArticleTiptapExtensions } from '../lib/tiptapSchema';
import { fileToCompressedDataUrl } from '../lib/imageCompress';

export type ArticleEditorValue = {
  json: JSONContent;
  html: string;
  text: string;
};

const FONT_SIZE_STEPS = ['14px', '16px', '18px', '20px', '24px', '30px'] as const;

export function ArticleEditor({
  value,
  onChange,
  placeholder = '请输入文章正文内容…',
}: {
  value?: JSONContent | string | null;
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
        class: 'prose max-w-none focus:outline-none min-h-[280px] px-4 py-4 prose-p:my-4 prose-headings:my-5 prose-li:my-1 prose-ol:list-decimal prose-ul:list-disc prose-ol:pl-6 prose-ul:pl-6 [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-6 [&_ul]:pl-6 [&_ol>li]:list-item [&_ul>li]:list-item [&_li]:my-1 [&_figure]:my-6 [&_figure]:text-center [&_figure_img]:mx-auto [&_figure_img]:block [&_img]:mx-auto [&_img]:block',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.({
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText(),
      });
    },
  });

  useEffect(() => {
    if (!editor || !value) return;
    if (typeof value === 'string') {
      const nextHtml = value.trim();
      const currentHtml = editor.getHTML().trim();
      if (nextHtml && currentHtml !== nextHtml) {
        editor.commands.setContent(nextHtml);
      }
      return;
    }
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const insertImageFromFile = async (file: File) => {
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

  const toolbarButtonClass = (active = false) =>
    `px-2 py-1 rounded hover:bg-white border text-sm ${active ? 'bg-white border-purple-300 text-gray-900' : 'border-transparent text-gray-700'}`;
  const currentFontSize = String(editor.getAttributes('textStyle').fontSize || '16px');
  const resolvedFontSize = FONT_SIZE_STEPS.includes(currentFontSize as (typeof FONT_SIZE_STEPS)[number]) ? currentFontSize : '16px';
  const currentFontIndex = FONT_SIZE_STEPS.indexOf(resolvedFontSize as (typeof FONT_SIZE_STEPS)[number]);

  const setFontSizeStep = (nextSize: string) => {
    if (nextSize === '16px') {
      editor.chain().focus().unsetFontSize().run();
      return;
    }
    editor.chain().focus().setFontSize(nextSize).run();
  };

  const nudgeFontSize = (direction: -1 | 1) => {
    const nextIndex = Math.min(FONT_SIZE_STEPS.length - 1, Math.max(0, currentFontIndex + direction));
    setFontSizeStep(FONT_SIZE_STEPS[nextIndex]);
  };

  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={toolbarButtonClass(editor.isActive('paragraph'))}
          title="正文"
        >
          正文
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={toolbarButtonClass(editor.isActive('heading', { level: 2 }))}
          title="标题 H2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={toolbarButtonClass(editor.isActive('heading', { level: 3 }))}
          title="标题 H3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={toolbarButtonClass(editor.isActive('heading', { level: 4 }))}
          title="标题 H4"
        >
          H4
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => nudgeFontSize(-1)}
          className={toolbarButtonClass(false)}
          title="统一缩小字号"
        >
          A-
        </button>
        <select
          value={resolvedFontSize}
          onChange={(e) => setFontSizeStep(e.target.value)}
          className="h-8 rounded border border-gray-200 bg-white px-2 text-sm text-gray-700"
          title="字号"
        >
          {FONT_SIZE_STEPS.map((step) => (
            <option key={step} value={step}>
              {step.replace('px', '')} 号
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => nudgeFontSize(1)}
          className={toolbarButtonClass(false)}
          title="统一放大字号"
        >
          A+
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={toolbarButtonClass(editor.isActive('bold'))}
          title="加粗"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={toolbarButtonClass(editor.isActive('italic'))}
          title="斜体"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={toolbarButtonClass(editor.isActive('underline'))}
          title="下划线"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={toolbarButtonClass(editor.isActive('strike'))}
          title="删除线"
        >
          <Strikethrough size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={toolbarButtonClass(editor.isActive('highlight'))}
          title="高亮"
        >
          <Highlighter size={16} />
        </button>
        <button
          type="button"
          onClick={promptLink}
          className={toolbarButtonClass(editor.isActive('link'))}
          title="链接"
        >
          <LinkIcon size={16} />
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={toolbarButtonClass(editor.isActive('bulletList'))}
          title="无序列表"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={toolbarButtonClass(editor.isActive('orderedList'))}
          title="有序列表"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={toolbarButtonClass(editor.isActive('blockquote'))}
          title="引用"
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={toolbarButtonClass(false)}
          title="分割线"
        >
          <Minus size={16} />
        </button>

        <span className="mx-1 h-5 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={toolbarButtonClass(false)}
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
          className={toolbarButtonClass(false)}
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
