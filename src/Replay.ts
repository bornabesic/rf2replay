
export default class Replay {

    data: Uint8Array;

    private consumeIndex: number = 0;
    private bufferIndex: number = 0;

    constructor(data: Uint8Array) {
        this.data = data;
        this.readVcrHeader();
    }

    private readVcrHeader() {
        this.consumeIndex = this.data.findIndex((byte) => byte == 0x0A);
        if (this.consumeIndex == -1) {
            throw new Error("Could not find the VCR file header.");
        }
        const gmbHeader = this.readStringWholeBuffer();
        this.expect(0x0A);
        this.expectString("IRSR");
        const version = this.readFloat().toPrecision(3);
        // TODO
    }

    private readStringWholeBuffer(): string {
        const bytes: number[] = Array.from(this.data.subarray(this.bufferIndex, this.consumeIndex));
        const string = String.fromCharCode(...bytes);
        this.bufferIndex = this.consumeIndex;
        return string;
    }

    private readFloat(littleEndian: boolean = true): number {
        this.bufferIndex = this.consumeIndex;
        this.consumeIndex += 4;
        const view = new DataView(this.data.buffer, this.bufferIndex, 4);
        const number = view.getFloat32(0, littleEndian);
        this.bufferIndex = this.consumeIndex;
        return number;
    }

    private expect(...bytes: number[]) {
        for (let i = 0; i < bytes.length; ++i) {
            const byteAvailable = this.data[this.consumeIndex + i];
            const byteExpected = bytes[i];
            if (byteAvailable != byteExpected) {
                throw Error(`Expected ${byteExpected} but got ${byteAvailable}.`)
            }
        }
        this.consumeIndex += bytes.length;
        this.bufferIndex = this.consumeIndex;
    }

    private expectString(string: string) {
        this.expect(...Replay.stringToBytes(string));
    }

    private static stringToBytes(string: string) {
        const bytes: number[] = [];
        for (let i = 0; i < string.length; ++i) {
            bytes.push(string.charCodeAt(i));
        }
        return bytes;
    }
}
