import { Box, Text } from "ink";

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
      {lines.map((line, i) => (
        <Text key={i}>
          <Text color="gray" dimColor>
            {String(i + 1).padStart(maxLineNumWidth)} │{" "}
          </Text>
          <Text color="white">{line}</Text>
        </Text>
      ))}
    </Box>
  );
}
