import { useRef } from "react";

type Props = {
  code: string;
  language: string;
  onChange: (val: string) => void;
  onLanguageChange: (lang: string) => void;
};

export default function CodeEditor({ code, language, onChange, onLanguageChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-indentation Logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;

      const newValue = value.substring(0, start) + "    " + value.substring(end);
      onChange(newValue);

      // Move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
    else if (e.key === "Enter") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;

      // Get current line up to cursor
      const lines = value.substring(0, start).split("\n");
      const currentLine = lines[lines.length - 1];

      // Count leading spaces
      const match = currentLine.match(/^(\s*)/);
      const spaces = match ? match[1] : "";

      let extraIndent = "";
      const trimmed = currentLine.trim();

      // Python: colon check
      if (language === "python" && trimmed.endsWith(":")) {
        extraIndent = "    ";
      }
      // C++/Java/JS: curly brace check
      else if (["cpp", "java", "javascript"].includes(language) && trimmed.endsWith("{")) {
        extraIndent = "    ";
      }

      const newValue = value.substring(0, start) + "\n" + spaces + extraIndent + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1 + spaces.length + extraIndent.length;
        }
      }, 0);
    }
  };

  return (
    <div className="space-y-3">
      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="bg-slate-800 text-white px-3 py-2 rounded border border-slate-700 w-40"
      >
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
        <option value="javascript">JavaScript</option>
      </select>

      {/* Code editor */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="
          w-full
          min-h-[400px]
          bg-slate-900
          text-slate-100
          font-mono
          text-sm
          p-4
          rounded-lg
          border
          border-slate-700
          focus:outline-none
          focus:ring-2
          focus:ring-purple-500
          leading-relaxed
        "
        placeholder="Write your solution here..."
      />
    </div>
  );
}
