import Head from 'next/head'
import {useState} from 'react';
import {PGChuck} from "@/types";
import endent from "endent";

export default function Home() {
    const [query, setQuery] = useState('');
    const [answer, setAnswer] = useState('');
    const [chunks, setChunks] = useState < PGChuck[]> ([]);
    const [loading, setLoading] = useState(false);

    const handleInput = async (event: any) => {
        event.preventDefault();

        if (! query) {
            alert('Please enter a query');

            return;
        }

        setLoading(true);
        setAnswer('');
        const searchResponse = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({query})
        });

        if (!searchResponse.ok) {
            setLoading(false);

            return;
        }

        const results: PGChuck[] = await searchResponse.json();
        setChunks(results);

        const prompt = endent`
        Use the following passages to answer the query: "${query}"
        
        ${results?.map((chunk) => chunk.content).join("\n\n")}
        `;

        const answerResponse = await fetch('/api/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({prompt})
        });

        if (! answerResponse.ok) {
            setLoading(false);

            return;
        }

        const data = answerResponse.body;

        if (! data) {
            setLoading(false);

            return;
        }

        const reader = data.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (! done) {
            const {value, done: doneReading} = await reader.read();
            const chunkValue = decoder.decode(value);

            setAnswer((prev) => prev + chunkValue);
            done = doneReading;
        }

        setLoading(false);
    };

    return (
        <>
            <Head>
                <title>Knowledge Base GPT</title>
                <meta name="description" content="AI G&A on Ancient Greece articles"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <link rel="icon" href="/favicon.ico"/>
            </Head>
            <div className="flex flex-col max-w-xl mx-auto mt-8">
                <form onSubmit={handleInput}>
                    <div className="flex">
                        <input
                            type="text"
                            className="border border-gray-300 rounded-md rounded-r-none p-2 flex-1"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={'Ask a question about Ancient Greece...'}
                        />
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md rounded-l-none"
                        >
                            Submit
                        </button>
                    </div>
                </form>

                <div className="mt-4">
                    {
                        loading
                            ? <div>Loading...</div>
                            : <div>{answer}</div>
                    }
                </div>
            </div>
        </>
    )
}
