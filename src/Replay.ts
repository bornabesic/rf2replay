
export default class Replay {

    version: string;
    drivers: Array<Driver>;
    sliceCount: number;
    eventCountTotal: number;
    timeStart: number;
    timeEnd: number;

    scnFilename: string;
    aiwFilename: string;
    modName: string;
    modVersion: string;
    modUid: string;
    trackPath: string;

    sessionType: SessionType;
    isPrivateSession: boolean;

    private data: Uint8Array;
    private consumeIndex: number;
    private bufferIndex: number;

    constructor(data: Uint8Array) {
        this.data = data;
        this.consumeIndex = 0;
        this.bufferIndex = 0;
        this.readVcrHeader();
        this.readReplayInfo();
        this.readDriverList();
        this.readSlicesHeader();
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
        const modInfo = this.readString(); // TODO Parse
        this.scnFilename = this.readString()
        this.aiwFilename = this.readString()
        this.modName = this.readString(2)
        this.modVersion = this.readString(2)
        this.modUid = this.readString(2)
        this.trackPath = this.readString(2)

        this.skip(1); // Unknown

        [this.sessionType, this.isPrivateSession] = this.readSessionInfo();

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
        this.drivers = [];
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

    private readSlicesHeader() {
        this.sliceCount = this.readInteger()
        this.eventCountTotal = this.readInteger()
        this.timeStart = this.readFloat()
        this.timeEnd = this.readFloat()
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.sliceCount; ++i) {
            const time = this.readFloat();
            const eventCount = this.readInteger(2);

            for (let j = 0; j < eventCount; ++j) {
                const header = this.readInteger();

                const eventSize = (header >> 8) & 0x1FF;
                const eventClass = (header >> 29);
                const eventType = (header >> 17) & 0x3F;
                const eventDriver = header & 0xFF;

                this.skip(1) // Unknown
                this.ensureBytes(eventSize);
                if (eventClass == 0 && 7 <= eventType && eventType <= 16) {
                    const telemetry = this.readTelemetry()
                    yield [time, eventDriver, telemetry];
                }
                else if (eventClass == 3 && eventType == 6) {
                    const checkpoint = this.readCheckpoint()
                    yield [time, eventDriver, checkpoint];
                }
                this.bufferIndex = this.consumeIndex;
            }
        }
    }

    private readTelemetry() {
        const info1 = this.readInteger();
        const info2 = this.readInteger();
        const speed = this.takeBytes(5);
        this.skip(23); // Unknown
        const tcAndBrakes = this.readInteger(1);
        const x = this.readFloat();
        const y = this.readFloat();
        const z = this.readFloat();
        const roll = this.readFloat();
        const pitch = this.readFloat();
        const yaw = this.readFloat();

        // TODO tcAndBrakes is wrong a little bit
        // TODO x, y and z are totally wrong
        // TODO Decode speed

        const steering = info1 & 127;
        const throttle = (info1 >> 11 & 63) / 0b111111;
        const rpm = info1 >> 18;
        const inPit = (info1 >> 17 & 0x1) != 0;
        const brake = (tcAndBrakes & 63) / 0b111111;

        return {
            throttle,
            brake,
            steering,
            rpm,
            inPit,
        } as Telemetry;
    }

    private readCheckpoint() {
        const cumulativeTime = this.readFloat()
        const timestamp = this.readFloat()
        const lapNumber = this.readInteger(1)
        let sector = this.readInteger(1)
        sector = (sector >> 6) & 3
        if (sector == 0)
            sector = 3
        return {
            cumulativeTime,
            lapNumber,
            sector,
            timestamp
        } as Checkpoint;
    }

    private ensureBytes(count: number) {
        const countAvailable = this.consumeIndex - this.bufferIndex;
        if (countAvailable < count) {
            this.consumeIndex += count - countAvailable;
        }
    }

    private takeBytes(count: number) {
        this.ensureBytes(count);
        const bytes = Array.from(this.data.subarray(this.bufferIndex, this.bufferIndex + count));
        this.bufferIndex += count;
        return bytes;
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
        this.bufferIndex += size;
        if (this.consumeIndex < this.bufferIndex)
            this.consumeIndex = this.bufferIndex;
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
        this.ensureBytes(4);
        const view = new DataView(this.data.buffer, this.bufferIndex, 4);
        const number = view.getFloat32(0, littleEndian);
        this.bufferIndex += 4;
        return number;
    }

    private readInteger(size: number = 4, littleEndian: boolean = true): number {
        if (size == 3) size = 4;

        this.ensureBytes(size);
        const view = new DataView(this.data.buffer, this.bufferIndex, size);
        this.bufferIndex += size;
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


class Telemetry {
    throttle: number
    brake: number
    steering: number
    rpm: number
    inPit: boolean
}

class Checkpoint {
    cumulativeTime: number
    lapNumber: number
    sector: number
    timestamp: number
}
