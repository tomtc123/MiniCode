import { Box, Text } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const lines = code.split("\n");
  const maxLineNumWidth = String(lines.length).length;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      marginY={0}
    >
      {language && (
        <Text color="gray" dimColor>
          {language}
        </Text>
      )}
      <SyntaxHighlight code={code} language={language ?? "text"} />
    </Box>
  );
}
