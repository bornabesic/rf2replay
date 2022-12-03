
export default class Replay {

    version: string;
    drivers: Array<Driver> = [];

    private data: Uint8Array;
    private consumeIndex: number = 0;
    private bufferIndex: number = 0;

    constructor(data: Uint8Array) {
        this.data = data;
        this.readVcrHeader();
        this.readReplayInfo();
        this.readDriverList();
    }

    private readVcrHeader() {
        this.consumeIndex = this.data.findIndex((byte) => byte == 0x0A);
        if (this.consumeIndex == -1) {
            throw new Error("Could not find the VCR file header.");
        }
        const gmbHeader = this.readStringWholeBuffer();
        this.expect(0x0A);
        this.expectString("IRSR");
        this.version = this.readFloat().toPrecision(3);
    }

    private readReplayInfo() {
        const rfm = this.readString();
        this.skip(4); // Unknown
        const modInfo = this.readString();
        const scnFilename = this.readString()
        const aiwFilename = this.readString()
        const modName = this.readString(2)
        const modVersion = this.readString(2)
        const modUid = this.readString(2)
        const trackPath = this.readString(2)

        this.skip(1); // Unknown

        const [sessionType, isPrivateSession] = this.readSessionInfo();

        this.skip(67); // Unknown
    }

    private readSessionInfo() {
        const sessionInfo = this.readInteger(1)
        const sessionTypeNumber = sessionInfo & 0xF;
        let sessionType;
        if (sessionTypeNumber == 0)
            sessionType = SessionType.TEST_DAY;
        else if (1 <= sessionTypeNumber && sessionTypeNumber <= 4)
            sessionType = SessionType.PRACTICE;
        else if (5 <= sessionTypeNumber && sessionTypeNumber <= 8)
            sessionType = SessionType.QUALIFYING;
        else if (sessionTypeNumber == 9)
            sessionType = SessionType.WARMUP;
        else if (10 <= sessionTypeNumber && sessionTypeNumber <= 13)
            sessionType = SessionType.RACE;
        else
            throw Error(`Cannot convert number ${sessionTypeNumber} to a session type.`)

        const isPrivateSession = (sessionInfo >> 7 & 1) == 1;
        return [sessionType, isPrivateSession];
    }

    private readDriverList() {
        const driverCount = this.readInteger();
        for (let i = 0; i < driverCount; ++i) {
            const number = this.readInteger(1);
            const name = this.readString(1);
            const codriverName = this.readString(1) || null;
            const vehicleName = this.readString(2);
            const vehicleVersion = this.readString(2);
            const vehicleId = this.readString(2);
            const vehicleFilename = this.readNullTerminatedString(32);

            this.skip(49) // Unknown

            let timeEntry = this.readFloat() // TODO
            let timeExit = this.readFloat() // TODO
            timeEntry = null;
            timeExit = null;

            this.drivers.push({
                number,
                name,
                codriverName,
                vehicleName,
                vehicleVersion,
                vehicleId,
                vehicleFilename,
                timeEntry,
                timeExit,
            } as Driver)
        }
    }

    private readNullTerminatedString(maxBytes: number): string {
        const end = this.consumeIndex + maxBytes - 1;
        this.bufferIndex = this.consumeIndex;
        let i = this.consumeIndex;
        while (this.data[i] != 0) {
            ++i;
            if (i - this.consumeIndex > maxBytes) {
                throw Error("Could not find null-terminated sting.");
            }
        }
        this.consumeIndex = i;
        const string = this.readStringWholeBuffer();
        this.consumeIndex = end;
        this.bufferIndex = this.consumeIndex;
        return string;
    }

    private skip(size: number) {
        this.consumeIndex += size;
        this.bufferIndex = this.consumeIndex;
    }

    private readStringWholeBuffer(): string {
        let string = "";
        for (let i = this.bufferIndex; i < this.consumeIndex; ++i) {
            string += String.fromCharCode(this.data[i]);
        }
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

    private readInteger(size: number = 4, littleEndian: boolean = true): number {
        if (size == 3) size = 4;

        this.consumeIndex += size;
        const view = new DataView(this.data.buffer, this.bufferIndex, size);
        this.bufferIndex = this.consumeIndex;
        if (size == 1)
            return view.getUint8(0);
        else if (size == 2)
            return view.getUint16(0, littleEndian);
        else if (size == 4) {
            return view.getUint32(0, littleEndian);
        }
        else {
            throw Error(`Unsupported integer size: ${size}`);
        }
    }

    private readString(lengthSize: number = 4): string {
        const length = this.readInteger(lengthSize);
        this.bufferIndex = this.consumeIndex;
        this.consumeIndex += length;
        return this.readStringWholeBuffer();
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

enum SessionType {
    TEST_DAY,
    PRACTICE,
    QUALIFYING,
    WARMUP,
    RACE,
}

class Driver {
    number: number
    name: string
    codriverName: string
    vehicleName: string
    vehicleVersion: string
    vehicleId: string
    vehicleFilename: string
    timeEntry: number
    timeExit: number
}
