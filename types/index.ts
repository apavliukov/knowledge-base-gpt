export type PGArticle = {
    title: string;
    url: string;
    date: string;
    content: string;
    tokens: number;
    chunks: PGChuck[];
}

export type PGChuck = {
    article_title: string;
    article_url: string;
    article_date: string;
    content: string;
    content_tokens: number;
    embedding: number[];
}

export type PGJson = {
    tokens: number;
    articles: PGArticle[];
}