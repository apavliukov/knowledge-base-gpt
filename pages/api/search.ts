import {supabaseAdmin} from "@/utils";

export const config = {
    runtime: 'edge',
}

const handler = async (request: Request): Promise<Response> => {
    try {
        const {query} = (await request.json()) as { query: string };
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: query
            }),
        });
        const json = await response.json();
        const embedding = json.data[0].embedding;
        const {data: chunks, error} = await supabaseAdmin.rpc('knowledge_base_search', {
            query_embedding: embedding,
            similarity_threshold: 0.5,
            match_count: 5
        });

        if (error) {
            console.error(error);

            return new Response('Error', {status: 500})
        }

        return new Response(JSON.stringify(chunks), {status: 200});
    } catch (exception) {
        console.error(exception);
        return new Response('Error', {status: 500})
    }
}

export default handler;