import {loadEnvConfig} from "@next/env";
import {PGArticle, PGJson} from "@/types";
import fs from 'fs';
import {Configuration, OpenAIApi} from "openai";
import {createClient} from "@supabase/supabase-js";

const DATA_FILE = 'storage/data.json';

loadEnvConfig('');

const generateEmbeddings = async (articles: PGArticle[]) => {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    articles.forEach(function (article, articleIndex) {
        article.chunks.forEach(async function (chunk, chunkIndex) {
            const createEmbeddingRequest = await openai.createEmbedding({
                model: 'text-embedding-ada-002',
                input: chunk.content
            });
            const [{embedding}] = createEmbeddingRequest.data.data;
            const {data, error} = await supabase
                .from('knowledge_base')
                .insert({
                    article_title: article.title,
                    article_url: article.url,
                    article_date: article.date,
                    content: chunk.content,
                    content_tokens: chunk.content_tokens,
                    embedding
                })
                .select('*');

            if (error) {
                console.error('error', articleIndex, chunkIndex);
                console.error(error);
            } else {
                console.log('saved', articleIndex, chunkIndex);
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        });
    });
};

(async () => {
    const json: PGJson = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    await generateEmbeddings(json.articles);
})();