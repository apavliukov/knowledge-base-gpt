import {NextApiRequest} from "next";
import path from "path";
import os from "os";
import {IncomingForm} from "formidable";
import fs from "fs/promises";
import JSZip from "jszip";

export const getExtractedZipDirectoryPath = async (request: NextApiRequest) => {
    const zipFilePath = await getZipFilePathFromRequest(request);
    const newDirPath = zipFilePath + '-extracted';

    return await extractZipFile(zipFilePath, newDirPath);
};

export const getZipFilePathFromRequest = async (request: NextApiRequest) => {
    const form = new IncomingForm();
    // @ts-ignore
    form.uploadDir = os.tmpdir();

    // @ts-ignore
    const { files } = await new Promise((resolve, reject) => {
        form.parse(request, (err, fields, files) => {
            if (err) {
                reject(err);
            } else {
                resolve({ fields, files });
            }
        });
    });

    return files.file.filepath;
};

export const extractZipFile = async(filePath: string, destinationDir: string) => {
    try {
        const fileContent = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(fileContent);

        const files = Object.values(zip.files);
        const extractPromises = [];

        for (const file of files) {
            const filePath = path.join(destinationDir, file.name);

            if (file.dir) {
                await fs.mkdir(filePath, { recursive: true });
            } else {
                extractPromises.push(file.async("nodebuffer").then((content) => {
                    return fs.mkdir(path.dirname(filePath), { recursive: true }).then(() => {
                        return fs.writeFile(filePath, content);
                    });
                }));
            }
        }

        await Promise.all(extractPromises);

        return path.join("/", path.relative(process.cwd(), destinationDir));
    } catch (err) {
        console.error("Error extracting zip file: ", err);
        throw err;
    }
};