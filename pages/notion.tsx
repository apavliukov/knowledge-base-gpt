import Head from 'next/head'
import {useState} from 'react';
import {Answer} from '@/components/Answer/Answer';
import {Document} from "langchain/docstore";
import {ChainValues} from "langchain/schema";
import UploadZip from "@/components/Forms/UploadZip";
import {IconExternalLink} from "@tabler/icons-react";

export default function Home() {
    const [query, setQuery] = useState('');
    const [answer, setAnswer] = useState('');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearchInput = async (event: any) => {
        event.preventDefault();

        if (!query) {
            alert('Please enter a query');

            return;
        }

        setLoading(true);
        setAnswer('');
        setDocuments([]);

        const searchResponse = await fetch('/api/notion/search', {
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

        const results: ChainValues = await searchResponse.json();

        setDocuments(results.sourceDocuments);
        setAnswer(results.text);
        setLoading(false);
    };

    return (
        <>
            <Head>
                <title>Notion Q&A | Knowledge Base GPT</title>
                <meta name="description" content="AI Q&A on Notion documents"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <link rel="icon" href="/favicon.ico"/>
            </Head>
            <div className="flex flex-col max-w-xl mx-auto mt-8">
                <h1 className="mb-8 text-center text-3xl font-bold">Q&A for Notion Documents</h1>

                <div className="mb-8">
                    <UploadZip/>
                </div>

                <form onSubmit={handleSearchInput}>
                    <div className="flex">
                        <input
                            type="text"
                            className="border border-gray-300 rounded-md rounded-r-none p-2 flex-1"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={'Ask a question'}
                        />
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md rounded-l-none"
                        >
                            Submit
                        </button>
                    </div>
                </form>

                <div className="mt-4">
                    {loading
                        ? (
                            <div className="mt-6 w-full">
                                <div className="font-bold text-2xl mt-6">Documents</div>
                                <div className="animate-pulse mt-2">
                                    <div className="h-4 bg-gray-300 rounded"></div>
                                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                                </div>
                            </div>
                        )
                        : answer ? (
                            <div className="mt-6">
                                <div className="font-bold text-2xl mb-2">Answer</div>
                                <Answer text={answer}/>

                                <div className="mt-6 mb-16">
                                    <div className="font-bold text-2xl">Documents</div>

                                    {documents.map((document, index) => (
                                        <div key={index}>
                                            <div className="mt-4 border border-zinc-600 rounded-lg p-4">
                                                <div className="flex justify-between">
                                                    <a
                                                        className="hover:opacity-50 ml-auto"
                                                        href={document.metadata.notionUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <IconExternalLink/>
                                                    </a>
                                                </div>
                                                <div className="mt-2">{document.pageContent}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6 text-center text-lg">{`AI-powered search.`}</div>
                        )
                    }
                </div>
            </div>
        </>
    )
}
