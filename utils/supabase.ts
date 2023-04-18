import {createClient} from "@supabase/supabase-js";
import {Document} from "langchain/docstore";
import {SupabaseVectorStore} from "langchain/vectorstores/supabase";
import {OpenAIEmbeddings} from "langchain/embeddings/openai";

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const uploadDocumentsToSupabase = async (documents: Document[]) => {
    const client = await supabaseAdmin;

    await SupabaseVectorStore.fromDocuments(
        documents,
        new OpenAIEmbeddings(),
        {
            client,
            tableName: "documents",
            queryName: "match_documents",
        });
};