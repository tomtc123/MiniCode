import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { SlashMenu, filterCommands } from "./slash-menu.js";

interface UserInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function UserInput({ onSubmit, disabled }: UserInputProps) {
  const [value, setValue] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);

  const isSlashMode = value.startsWith("/");
  const filtered = isSlashMode ? filterCommands(value) : [];

  useInput(
    (input, key) => {
      if (disabled) return;

      // Escape closes menu
      if (key.escape && menuOpen) {
        setMenuOpen(false);
        setMenuIndex(0);
        return;
      }

      // Up/Down arrows for menu navigation
      if (menuOpen && isSlashMode && filtered.length > 0) {
        if (key.upArrow) {
          setMenuIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
          return;
        }
        if (key.downArrow) {
          setMenuIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
          return;
        }
        // Tab to autocomplete
        if (key.tab) {
          const selected = filtered[menuIndex];
          if (selected) {
            setValue(selected.name + " ");
            setCursorPos(selected.name.length + 1);
            setMenuOpen(false);
            setMenuIndex(0);
          }
          return;
        }
      }

      // Enter to submit
      if (key.return) {
        if (menuOpen && isSlashMode && filtered.length > 0) {
          const selected = filtered[menuIndex];
          if (selected) {
            onSubmit(selected.name);
            setValue("");
            setCursorPos(0);
            setMenuOpen(false);
            setMenuIndex(0);
          }
          return;
        }
        if (value.trim()) {
          onSubmit(value.trim());
          setValue("");
          setCursorPos(0);
          setMenuOpen(false);
          setMenuIndex(0);
        }
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
          setValue(newValue);
          setCursorPos(cursorPos - 1);
          setMenuIndex(0);
          if (!newValue.startsWith("/")) {
            setMenuOpen(false);
          }
        }
        return;
      }

      // Arrow keys
      if (key.leftArrow) {
        setCursorPos(Math.max(0, cursorPos - 1));
        return;
      }
      if (key.rightArrow) {
        setCursorPos(Math.min(value.length, cursorPos + 1));
        return;
      }

      // Ctrl+C
      if (key.ctrl && input === "c") {
        process.exit(0);
      }

      // Regular input
      if (input) {
        const newValue = value.slice(0, cursorPos) + input + value.slice(cursorPos);
        setValue(newValue);
        setCursorPos(cursorPos + input.length);
        setMenuIndex(0);
        // Open menu when typing "/"
        if (newValue === "/") {
          setMenuOpen(true);
        }
      }
    },
    { isActive: !disabled }
  );

  const beforeCursor = value.slice(0, cursorPos);
  const atCursor = value[cursorPos] || " ";
  const afterCursor = value.slice(cursorPos + 1);

  return (
    <Box flexDirection="column">
      {menuOpen && isSlashMode && (
        <SlashMenu filter={value.slice(1)} selectedIndex={menuIndex} />
      )}
      <Box borderStyle="round" borderColor={menuOpen ? "yellow" : "cyan"} paddingX={1}>
        <Text color={menuOpen ? "yellow" : "cyan"} bold>
          {">"}{" "}
        </Text>
        <Text>
          {beforeCursor}
          <Text inverse>{atCursor}</Text>
          {afterCursor}
        </Text>
        {disabled && (
          <Text color="gray"> (waiting...)</Text>
        )}
      </Box>
    </Box>
  );
}
