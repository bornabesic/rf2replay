<script lang="ts">
    import FilePicker from "./lib/FilePicker.svelte";
    import { Checkpoint, Replay, ReplayEventType, Telemetry } from "./Replay";

    // NOTE Firefox does not support import statements in web workers so it only works in the production build
    // https://github.com/vitejs/vite/issues/4586
    import MainWorker from "./worker?worker";
    import { setContext } from "svelte";

    let worker = new MainWorker();
    setContext("worker", worker);

    let replay: Replay = null;

    function onFileLoaded(event: CustomEvent<Uint8Array>) {
        const data = event.detail;
        try {
            replay = new Replay(data);
        } catch (error) {
            alert(error);
            return;
        }

        const telemetryData = {};
        const driverLapData = {};
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
                if (!(event.driverNumber in driverLapData)) {
                    driverLapData[event.driverNumber] = {};
                }
                driverLapData[event.driverNumber][checkpoint.lapNumber] = {
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
                };
            }
        }
        console.log(driverLapData);
    }
</script>

<main>
    <FilePicker on:fileLoaded={onFileLoaded} />
</main>

<style>
    main {
        color: red;
    }
</style>
