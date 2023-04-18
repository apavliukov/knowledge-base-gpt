import {ParsedEvent, ReconnectInterval, createParser} from "eventsource-parser";

export const OpenAiStream = async (prompt: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful system that answers queries about Ancient Greece articles. Response in 3-5 sentences.'
                },
                {
                    role: 'user',
                    content: prompt
                },
            ],
            max_tokens: 150,
            temperature: 0.0,
            stream: true
        })
    });

    if (response.status !== 200) {
        throw new Error('Error');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
        async start(controller) {
            const onParse = (event: ParsedEvent | ReconnectInterval) => {
                if (event.type === 'event') {
                   const data = event.data;

                   if (data === '[DONE]') {
                       controller.close();

                       return;
                   }

                   try {
                       const json = JSON.parse(data);
                       const text = json.choices[0].delta.content;
                       const queue = encoder.encode(text);

                       controller.enqueue(queue);
                   } catch (exception) {
                       controller.error(exception);
                   }
                }
            }

            const parser = createParser(onParse);

            for await (const chunk of response.body as any) {
                parser.feed(decoder.decode(chunk));
            }
        }
    });

    return stream;
};