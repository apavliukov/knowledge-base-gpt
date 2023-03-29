import {OpenAiStream} from "@/utils";

export const config = {
    runtime: 'edge',
}

const handler = async (request: Request): Promise<Response> => {
     try {
         const {prompt} = (await request.json()) as { prompt: string };
         const stream = await OpenAiStream(prompt);

         return new Response(stream, {status: 200});
     } catch (exception) {
         console.error(exception);
         return new Response('Error', {status: 500})
     }
};

export default handler;