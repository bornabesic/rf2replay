/*
    rF2 Replay
    Copyright (C) 2023  Borna Bešić

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { inflate } from "pako";
import { Checkpoint, ReplayEventType, Telemetry, Replay } from "./Replay";

onmessage = (event: MessageEvent<any>) => {
    const message = event.data;
    if (message.type === "decompress") {
        const bytes: Uint8Array = message.data;
        decompress(bytes);
    }
    else if (message.type === "getDriverLapData") {
        const data: Uint8Array = message.data;
        try {
            const replay = new Replay(data);
            getDriverLapData(replay);
        }
        catch (error) {
            postMessage({
                type: "error",
                data: error,
            })
        }
    }
}

function decompress(bytes: Uint8Array) {
    const bytesDecompressed: Uint8Array = inflate(bytes);
    postMessage(bytesDecompressed);
}

function getDriverLapData(replay: Replay) {
    const driverLapData = new Map<number, Map<number, any>>();
    const telemetryData = {};
    postMessage({
        type: "drivers",
        data: replay.drivers,
    })
    for (const event of replay) {
        if (event.type === ReplayEventType.TELEMETRY) {
            const telemetry: Telemetry = event.data;
            if (!(event.driverNumber in telemetryData)) {
                telemetryData[event.driverNumber] = {
                    time: [],
                    throttle: [],
                    brake: [],
                };
            }
            const driverTelemetryData = telemetryData[event.driverNumber];
            driverTelemetryData.time.push(event.time);
            driverTelemetryData.throttle.push(telemetry.throttle);
            driverTelemetryData.brake.push(telemetry.brake);
        } else if (event.type === ReplayEventType.CHECKPOINT) {
            const checkpoint: Checkpoint = event.data;
            if (!(checkpoint.sector === 3 && checkpoint.cumulativeTime > 0))
                continue;

            const timeStartLap =
                checkpoint.timestamp - checkpoint.cumulativeTime;
            const timeEndLap = checkpoint.timestamp;
            const driverTelemetryData = telemetryData[event.driverNumber];
            const indexStart = driverTelemetryData.time.findIndex(
                (time: number) => time > timeStartLap
            );
            const indexEnd = driverTelemetryData.time.findIndex(
                (time: number) => time > timeEndLap
            );
            if (!driverLapData.has(event.driverNumber)) {
                driverLapData.set(event.driverNumber, new Map<number, Object>());
            }
            driverLapData.get(event.driverNumber).set(
                checkpoint.lapNumber,
                {
                    timeStartLap,
                    timeEndLap,
                    time: driverTelemetryData.time.slice(indexStart, indexEnd),
                    throttle: driverTelemetryData.throttle.slice(
                        indexStart,
                        indexEnd
                    ),
                    brake: driverTelemetryData.brake.slice(
                        indexStart,
                        indexEnd
                    ),
                }
            );
        }
    }
    postMessage({
        type: "driverLapData",
        data: driverLapData
    });
    postMessage({
        type: "close",
    });
}