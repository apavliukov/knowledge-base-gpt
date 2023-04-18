import {NextApiRequest, NextApiResponse} from 'next';
import {Document} from "langchain/docstore";
import {uploadDocumentsToSupabase} from "@/utils/supabase";
import {getExtractedZipDirectoryPath} from "@/utils/zip";
import {loadNotionDocumentsFromPath} from "@/utils/notion";

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
        const documentsPath = await getExtractedZipDirectoryPath(request);
        const documents: Document[] = await loadNotionDocumentsFromPath(documentsPath);

        await uploadDocumentsToSupabase(documents);

        response.status(200).json('Your archive was successfully uploaded');
    } catch (exception) {
        console.error(exception);
        response.status(500).json({ error: 'Internal Server Error' });
    }
}