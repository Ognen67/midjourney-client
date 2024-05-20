import "dotenv/config";
import { Midjourney } from "../src";
import fs from 'fs';
import path from "path";

async function saveImageFromUri(uri, prompt) {
    const response = await fetch(uri);
    if (!response.ok) {
        console.error(`Failed to download image for prompt: ${prompt}`);
        return;
    }

    // Save the image to a file in the result-images folder
    const imageBuffer = await response.arrayBuffer();
    const imageData = Buffer.from(imageBuffer);
    const imageFilename = path.join('result-images', `${prompt}_${Date.now()}.png`);
    fs.writeFileSync(imageFilename, imageData);

    console.log(`Image saved as ${imageFilename}`);
}

async function main() {
    const client = new Midjourney({
        ServerId: process.env.SERVER_ID,
        ChannelId: process.env.CHANNEL_ID,
        SalaiToken: <string>process.env.SALAI_TOKEN,
        HuggingFaceToken: process.env.HUGGINGFACE_TOKEN,
        Debug: true,
        Ws: true, // required  `Only you can see this`
    });
    await client.Connect();

    const prompts = JSON.parse(fs.readFileSync('scripts.json', 'utf-8'));

    for (const prompt of prompts) {
        const Imagine = await client.Imagine(
            prompt,
            (uri: string, progress: string) => {
                console.log("Imagine.loading", uri, "progress", progress);
            }
        );

        console.log({ Imagine });
        if (!Imagine) {
            continue;
        }

        let Upscale = await client.Upscale({
            index: 1,
            msgId: <string>Imagine.id,
            hash: <string>Imagine.hash,
            flags: Imagine.flags,
            loading: (uri: string, progress: string) => {
                console.log("Upscale.loading", uri, "progress", progress);
            },
        });
        
        if (!Upscale) {
            continue;
        }

        await saveImageFromUri(Upscale.uri, prompt);

        Upscale = await client.Upscale({
            index: 2,
            msgId: <string>Imagine.id,
            hash: <string>Imagine.hash,
            flags: Imagine.flags,
            loading: (uri: string, progress: string) => {
                console.log("Upscale.loading", uri, "progress", progress);
            },
        });
        
        if (!Upscale) {
            continue;
        }

        await saveImageFromUri(Upscale.uri, prompt);

        // Close the client outside the loop
    }

    client.Close(); // Close the client outside the loop
}

main()
    .then(() => {
        console.log("All prompts processed.");
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
