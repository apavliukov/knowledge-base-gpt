import {OpenAIEmbeddings} from "langchain/embeddings/openai";
import {OpenAI} from "langchain/llms/openai";
import {createClient} from "@supabase/supabase-js";
import {SupabaseVectorStore} from "langchain/vectorstores/supabase";
import {ConversationalRetrievalQAChain} from "langchain/chains";

export const config = {
    runtime: 'edge',
}

const handler = async (request: Request): Promise<Response> => {
    try {
        const {query} = (await request.json()) as { query: string };
        const embeddings = new OpenAIEmbeddings();
        const model = new OpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY!,
            temperature: 0.2,
        });

        /* Create the vectorstore */
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const vectorStore = await SupabaseVectorStore.fromExistingIndex(
            embeddings,
            {
                client,
                tableName: "documents",
                queryName: "match_documents",
            });

        /* Create the chain */
        const chain = ConversationalRetrievalQAChain.fromLLM(
            model,
            vectorStore.asRetriever(),
            { returnSourceDocuments: true }
        );

        const result = await chain.call({ question: query, chat_history: [] });

        console.log(result);

        return new Response(JSON.stringify(result), {status: 200});
    } catch (exception) {
        console.error(exception);
        return new Response('Error', {status: 500})
    }
}

export default handler;