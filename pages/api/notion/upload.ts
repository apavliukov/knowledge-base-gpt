import {NextApiRequest, NextApiResponse} from 'next';
import {OpenAIEmbeddings} from "langchain/embeddings/openai";
import {createClient} from "@supabase/supabase-js";
import {SupabaseVectorStore} from "langchain/vectorstores/supabase";
import {NotionLoader} from "langchain/document_loaders/fs/notion";
import {Document} from "langchain/docstore";
import JSZip from 'jszip';
import {IncomingForm} from 'formidable';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const config = {
    api: {
        bodyParser: false, // disable built-in parser
    },
};

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse
) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        response.status(405).send('Method Not Allowed');
    }

    try {
        const documentsRelativePath = await getExtractedDirectoryPath(request);

        console.log('documentsRelativePath', documentsRelativePath);

        // const documentsFullPath: string = path.join(process.cwd(), documentsRelativePath);
        //
        // console.log('documentsFullPath', documentsFullPath);

        await uploadDocumentsToSupabase(documentsRelativePath);

        await removeDirectory(documentsRelativePath);

        response.status(200).json('Your archive was successfully uploaded');
    } catch (exception) {
        console.error(exception);
        response.status(500).json({ error: 'Internal Server Error' });
    }
}

const uploadDocumentsToSupabase = async (documentsPath: string) => {
    const loader = new NotionLoader(documentsPath);
    const documents: Document[] = await loader.load();

    documents.forEach((document: Document) => {
        document.metadata = {
            notionUrl: extractLastPartFromNotionFilePath(document.metadata.source)
        };
    });

    /* Create the vectorstore */
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const vectorStore = await SupabaseVectorStore.fromDocuments(
        documents,
        new OpenAIEmbeddings(),
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        });
};

const getExtractedDirectoryPath = async (request: NextApiRequest) => {
    const zipFilePath = await getZipFilePathFromRequest(request);

    console.log('zipFilePath', zipFilePath);

    const newDirPath = path.join(os.tmpdir());

    console.log('newDirPath', newDirPath);

    return await extractZipFile(zipFilePath, newDirPath);
};

const removeDirectory = async (dirPath: string) => {
    // Get the list of files and directories in the directory
    const files = await fs.readdir(dirPath);

    // Loop through the files and directories
    for (const file of files) {
        const filePath = path.join(dirPath, file);

        // Check if the file is a directory
        const stats = await fs.lstat(filePath);
        if (stats.isDirectory()) {
            // Recursively remove the directory
            await removeDirectory(filePath);
        } else {
            // Remove the file
            await fs.unlink(filePath);
        }
    }

    // Remove the directory itself
    await fs.rmdir(dirPath);
};

const getZipFilePathFromRequest = async (request: NextApiRequest) => {
    const form = new IncomingForm();
    // @ts-ignore
    form.uploadDir = os.tmpdir();

    // @ts-ignore
    const { files } = await new Promise((resolve, reject) => {
        form.parse(request, (err, fields, files) => {
            if (err) {
                reject(err);
            } else {
                resolve({ fields, files });
            }
        });
    });

    return files.file.filepath;
};

const extractZipFile = async(filePath: string, destinationDir: string) => {
    try {
        const fileContent = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(fileContent);

        const files = Object.values(zip.files);
        const extractPromises = [];

        for (const file of files) {
            const filePath = path.join(destinationDir, file.name);

            if (file.dir) {
                await fs.mkdir(filePath, { recursive: true });
            } else {
                extractPromises.push(file.async("nodebuffer").then((content) => {
                    return fs.mkdir(path.dirname(filePath), { recursive: true }).then(() => {
                        return fs.writeFile(filePath, content);
                    });
                }));
            }
        }

        await Promise.all(extractPromises);

        return path.join("/", path.relative(process.cwd(), destinationDir));
    } catch (err) {
        console.error("Error extracting zip file: ", err);
        throw err;
    }
};

const extractLastPartFromNotionFilePath = (path: string) => {
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