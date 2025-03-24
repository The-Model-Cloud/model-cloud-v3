import React, { useEffect, useRef } from "react";
import { useField, useFormikContext } from "formik";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Box, Typography, Paper, IconButton, ButtonGroup, Tooltip } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

const FormikTiptap = ({ name, label }) => {
  const [field, meta] = useField(name);
  const { setFieldValue, setFieldTouched } = useFormikContext();
  const wasTouchedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing the job description...",
      }),
    ],
    content: field.value || "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
    onUpdate: ({ editor }) => {
      setFieldValue(name, editor.getHTML());
    },
    onBlur: () => {
      setFieldTouched(name, true);
      wasTouchedRef.current = true;
    },
  });

  useEffect(() => {
    if (editor && field.value !== editor.getHTML()) {
      editor.commands.setContent(field.value || "", false);
    }
  }, [editor, field.value]);

  return (
    <Box>

      {/* Toolbar */}
      {editor && (
        <ButtonGroup variant="outlined" size="small" sx={{ mb: 1 }}>
          <Tooltip title="Bold">
            <IconButton onClick={() => editor.chain().focus().toggleBold().run()} color={editor.isActive("bold") ? "primary" : "default"}>
              <FormatBoldIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italic">
            <IconButton onClick={() => editor.chain().focus().toggleItalic().run()} color={editor.isActive("italic") ? "primary" : "default"}>
              <FormatItalicIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bullet List">
            <IconButton onClick={() => editor.chain().focus().toggleBulletList().run()} color={editor.isActive("bulletList") ? "primary" : "default"}>
              <FormatListBulletedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ordered List">
            <IconButton onClick={() => editor.chain().focus().toggleOrderedList().run()} color={editor.isActive("orderedList") ? "primary" : "default"}>
              <FormatListNumberedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Undo">
            <IconButton onClick={() => editor.chain().focus().undo().run()}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton onClick={() => editor.chain().focus().redo().run()}>
              <RedoIcon />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      )}

      {/* Editor */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          minHeight: 180,
          "& .tiptap-editor": {
            minHeight: "140px",
            outline: "none",
            fontSize: "1rem",
            lineHeight: 1.6,
          },
        }}
      >
        <EditorContent editor={editor} />
      </Paper>

      {meta.touched && meta.error && (
        <Typography variant="caption" color="error" mt={1}>
          {meta.error}
        </Typography>
      )}
    </Box>
  );
};

export default FormikTiptap;
