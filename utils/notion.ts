import {NotionLoader} from "langchain/document_loaders/fs/notion";
import {Document} from "langchain/docstore";

export const loadNotionDocumentsFromPath = async (path: string) => {
    const loader = new NotionLoader(path);
    const documents: Document[] = await loader.load();

    documents.forEach((document: Document) => {
        document.metadata = {
            notionUrl: getDocumentNotionUrlFromPath(document.metadata.source)
        };
    });

    return documents;
};

export const getDocumentNotionUrlFromPath = (path: string) => {
    // extract the last part of the path using a regular expression
    const lastPart = path.match(/\/([^/]+)\.md$/)?.[1];

    if (!lastPart) {
        throw new Error('Invalid path format');
    }

    // remove the ".md" extension from the last part
    const nameWithoutExtension = lastPart.replace(/\.md$/, '');

    // replace empty spaces with dash sign
    const nameWithDashes = nameWithoutExtension.replace(/\s+/g, '-');

    // remove all bad characters
    const cleanedName = nameWithDashes.replace(/[^\w-]/g, '');

    // return the cleaned name
    return 'https://notion.so/' + cleanedName;
}