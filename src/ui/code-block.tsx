import { Box, Text } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const trimmed = code.replace(/\n+$/, "");

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      paddingY={0}
      marginY={0}
    >
      {language && (
        <Text color="gray" dimColor>
          {language}
        </Text>
      )}
      <SyntaxHighlight code={trimmed} language={language ?? "text"} />
    </Box>
  );
}
