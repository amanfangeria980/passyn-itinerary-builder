"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function RichText({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value || "",
    autofocus: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "max-w-none focus:outline-none min-h-[60px] text-sm leading-relaxed",
          className,
        ),
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. after a drag-reorder swaps which day
  // this editor renders). Comparison guards against re-applying our own edits.
  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, false);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="text-sm text-muted-foreground italic">Loading…</div>
    );
  }
  return (
    <div className="rounded-md border border-input px-3 py-2 bg-background focus-within:ring-2 focus-within:ring-ring">
      <EditorContent editor={editor} />
    </div>
  );
}
