import axios from 'axios';
import * as cheerio from 'cheerio';
import {encode} from 'gpt-3-encoder';
import {PGArticle, PGChuck, PGJson} from "@/types";
import fs from 'fs';
import {CheerioAPI} from "cheerio";

const BASE_URL = 'https://www.hellenistichistory.com';
const ARCHIVE_SLUG = 'blog';
const CHUNK_SIZE = 200;
const DATA_FILE = 'storage/data.json';

const run = async () => {
    const articles = await collectArticlesFromArchive(`${BASE_URL}/${ARCHIVE_SLUG}`);

    prepareJsonDataFile(articles);
};

const prepareJsonDataFile = (articles: PGArticle[]) => {
    const totalTokens = articles.reduce((acc, article) => acc + article.tokens, 0);
    const json: PGJson = {
        tokens: totalTokens,
        articles: articles
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(json));
};

const collectArticlesFromArchive = async (url: string) => {
    return await parsePage(url);
};

const parsePage: (url: string) => Promise<PGArticle[]> = async (url: string) => {
    const html = await axios.get(url);
    const $ = cheerio.load(html.data);
    const articles = await collectArticlesOnPage($);
    const nextPaginationLink = getNextPaginationPageUrl($);

    if (nextPaginationLink) {
        return articles.concat(await parsePage(nextPaginationLink));
    }

    return articles;
};

const getNextPaginationPageUrl = ($: CheerioAPI) => {
    const link = $('#main .pagination .nav-links .next');

    if (link.length) {
        return link.attr('href');
    }

    return null;
};

const collectArticlesOnPage = async ($: CheerioAPI) => {
    const links = await collectArticleLinksOnPage($);
    const articles: PGArticle[] = [];

    for (const link of links) {
        const article = await getArticle(link.url, link.title);

        articles.push(article);
    }

    return articles;
};

const collectArticleLinksOnPage = async ($: CheerioAPI) => {
    const linksCollection: { url: string, title: string }[] = [];
    const links = $('#main article .entry-title a');

    links.each((i, link) => {
        const url = $(link).attr('href');
        const title = $(link).text();

        if (url) {
            linksCollection.push({
                url,
                title
            });
        }
    });

    return linksCollection;
};

const getArticle = async (url: string, title: string) => {
    const html = await axios.get(url);
    const $ = cheerio.load(html.data);

    const date = $('.entry-date').attr('datetime') ?? '';
    const content = $('.entry-content').text()
        .replace(/\s+/g, ' ')
        .replace(/\n/g, ' ')
        .trim();

    const article: PGArticle = {
        title: title,
        url: url,
        date: date,
        content: content,
        tokens: encode(content).length,
        chunks: []
    };

    article.chunks = getChunksByArticle(article);

    return article;
};

const getChunksByArticle = (article: PGArticle) => {
    const {title, url, date, content} = article;
    const textChunks = getTextChunksFromContent(content);
    const articleChunks: PGChuck[] = textChunks.map((text, i) => {
        return {
            article_title: title,
            article_url: url,
            article_date: date,
            content: text,
            content_tokens: encode(text).length,
            embedding: []
        };
    });

    if (articleChunks.length > 1) {
        articleChunks.forEach((chunk, i) => {
            const prevChunk = articleChunks[i - 1];

            if (chunk.content_tokens < 100 && prevChunk) {
                prevChunk.content += ' ' + chunk.content;
                prevChunk.content_tokens = encode(prevChunk.content).length;
                articleChunks.splice(i, 1);
            }
        });
    }

    return articleChunks;
};

const getTextChunksFromContent = (content: string) => {
    const contentTokens = encode(content).length;

    if (contentTokens <= CHUNK_SIZE) {
        return [content];
    }

    const textChunks: string[] = [];

    const split = content.split('. ');
    let chunkText = '';

    split.forEach((sentence, i) => {
        const sentenceTokens = encode(sentence).length;
        const chunkTextTokens = encode(chunkText).length;

        if (chunkTextTokens + sentenceTokens > CHUNK_SIZE) {
            textChunks.push(chunkText);
            chunkText = '';
        }

        if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
            chunkText += sentence + '. ';
        } else {
            chunkText += sentence + ' ';
        }
    });

    textChunks.push(chunkText.trim());

    return textChunks;
};

(async () => {
    await run();
})();