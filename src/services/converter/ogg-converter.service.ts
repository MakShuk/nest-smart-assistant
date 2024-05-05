import installer from '@ffmpeg-installer/ffmpeg';
import { rejects } from 'assert';
import ffmpeg from 'fluent-ffmpeg';
import { resolve } from 'path';

export class OggConverter {
    constructor() {
        ffmpeg.setFfmpegPath(installer.path);
    }
    convertToMp3(inputFilePath: string, outputFilePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const command = ffmpeg(inputFilePath)
                    .inputOption('-t 30')
                    .output(outputFilePath)
                    .on('end', () => resolve(outputFilePath))
                    .on('error', (err) => reject(err.message));
                command.run();
            } catch (e: any) {
                reject(e.message);
            }
        });
    }
}