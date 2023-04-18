export const getMarkdownTitle = (markdownText: string): string => {
    const regex = /^#\s+(.*)/m;
    const match = regex.exec(markdownText);

    return match ? match[1] : '';
}