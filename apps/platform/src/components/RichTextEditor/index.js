import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import LinkIcon from "@mui/icons-material/Link";
import ImageIcon from "@mui/icons-material/Image";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

/**
 * Controlled rich-text editor (not tied to Formik) producing email-safe HTML.
 * Supports headings, bold/italic, lists, quotes, links and images (by URL).
 */
function RichTextEditor({ value, onChange, placeholder = "Write your email...", minHeight = 320 }) {
  const lastEmitted = useRef(value || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: { attributes: { class: "rte-content" } },
    onUpdate: ({ editor: e }) => {
      const html = e.isEmpty ? "" : e.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Load content set from outside (e.g. an existing campaign loaded after mount) without
  // fighting the user's typing: only apply when it differs from what we last emitted.
  useEffect(() => {
    if (editor && (value || "") !== lastEmitted.current) {
      lastEmitted.current = value || "";
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt("Link address (https://...). Leave empty to remove the link.", previous);
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      window.alert("Links must start with http:// or https://");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addImage = () => {
    const url = window.prompt("Image address (https://...). The image must already be hosted online.");
    if (!url) return;
    if (!/^https:\/\//i.test(url.trim())) {
      window.alert("Image addresses must start with https://");
      return;
    }
    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const btn = (title, icon, onClick, active = false) => (
    <Tooltip title={title}>
      <IconButton size="small" onClick={onClick} color={active ? "primary" : "default"}>
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Paper variant="outlined">
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.25} p={0.5}>
        {btn("Heading", <span style={{ fontWeight: 700, fontSize: 14, padding: "0 4px" }}>H2</span>, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {btn("Sub-heading", <span style={{ fontWeight: 700, fontSize: 14, padding: "0 4px" }}>H3</span>, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {btn("Bold", <FormatBoldIcon fontSize="small" />, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {btn("Italic", <FormatItalicIcon fontSize="small" />, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
        {btn("Bullet list", <FormatListBulletedIcon fontSize="small" />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {btn("Numbered list", <FormatListNumberedIcon fontSize="small" />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {btn("Quote", <FormatQuoteIcon fontSize="small" />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {btn("Link", <LinkIcon fontSize="small" />, setLink, editor.isActive("link"))}
        {btn("Image (by URL)", <ImageIcon fontSize="small" />, addImage)}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {btn("Undo", <UndoIcon fontSize="small" />, () => editor.chain().focus().undo().run())}
        {btn("Redo", <RedoIcon fontSize="small" />, () => editor.chain().focus().redo().run())}
      </Box>
      <Divider />
      <Box
        p={2}
        sx={{
          minHeight,
          "& .rte-content": { minHeight: minHeight - 40, outline: "none", fontSize: "1rem", lineHeight: 1.6 },
          "& .rte-content p": { margin: "0 0 12px" },
          "& .rte-content img": { maxWidth: "100%", height: "auto" },
          "& .rte-content a": { color: "#0b6bcb" },
          "& .rte-content blockquote": { borderLeft: "3px solid #ddd", margin: "0 0 12px", paddingLeft: 12, color: "#555" },
          "& p.is-editor-empty:first-of-type::before": {
            content: "attr(data-placeholder)",
            color: "#aaa",
            float: "left",
            height: 0,
            pointerEvents: "none",
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}

export default RichTextEditor;
