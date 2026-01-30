import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MDEditorProps {
  value: string;
  setValue: (str: string) => void;
}
export default function MDEditor({ value, setValue }: MDEditorProps) {
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  return (
    <div className="markdown-editor-container">
      <div className="editor-tabs">
        <button type="button" className={editorMode === "write" ? "active" : ""} onClick={() => setEditorMode("write")}>
          Write
        </button>
        <button
          type="button"
          className={editorMode === "preview" ? "active" : ""}
          onClick={() => setEditorMode("preview")}
        >
          Preview
        </button>
      </div>
      <div className="editor-body">
        {editorMode === "write" ? (
          <textarea
            className="editor-textarea"
            placeholder="Describe the vulnerability, reproduction steps, expected vs actual behavior, impacted components, and potential impact..."
            value={value}
            onChange={e => setValue(e.target.value)}
            maxLength={5000}
          />
        ) : (
          <div className="editor-preview markdown-content">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <span className="preview-empty">Nothing to preview</span>
            )}
          </div>
        )}
      </div>
      <div className="editor-footer">
        <span>Supports Markdown</span>
        <span className="char-count">{value.length.toLocaleString()}/5,000</span>
      </div>
    </div>
  );
}
