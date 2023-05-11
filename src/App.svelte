<script lang="ts">
    import FilePicker from "./lib/FilePicker.svelte";

    // NOTE Firefox does not support import statements in web workers so it only works in the production build
    // https://github.com/vitejs/vite/issues/4586
    import MainWorker from "./worker?worker";
    import { setContext } from "svelte";
    import Dygraph from "dygraphs";

    let worker = new MainWorker();
    setContext("worker", worker);

    let drivers = null;
    let driverLapData: Map<number, Map<number, any>> = null;
    const selectedLaps = new Map<number, Set<number>>();

    function onFileLoaded(event: CustomEvent<Uint8Array>) {
        const data = event.detail;

        drivers = null;
        driverLapData = null;

        worker.addEventListener("message", onData);
        worker.postMessage({
            type: "getDriverLapData",
            data: data,
        });
    }

    function onData(event: MessageEvent<any>) {
        const message = event.data;
        if (message.type == "driverLapData") {
            driverLapData = message.data;
        } else if (message.type == "drivers") {
            drivers = message.data;
        } else if (message.type == "error") {
            worker.removeEventListener("message", onData);
            alert(message.data);
        } else if (message.type == "close") {
            worker.removeEventListener("message", onData);
        }
    }

    function onLapSelectionChange(
        driverNumber: number,
        lapNumber: number,
        event: Event
    ) {
        const checkbox = event.target as HTMLInputElement;

        if (!selectedLaps.has(driverNumber))
            selectedLaps.set(driverNumber, new Set<number>()); 


        const selectedDriverLaps = selectedLaps.get(driverNumber);
        if (checkbox.checked) selectedDriverLaps.add(lapNumber);
        else selectedDriverLaps.delete(lapNumber);

        updatePlotData();
    }

    function updatePlotData() {
        const divThrottle = document.getElementById("plot-throttle");
        const divBrake = document.getElementById("plot-brake");
        removeAllChildren(divThrottle);
        removeAllChildren(divBrake);

        const throttleData = [];
        const brakeData = [];
        const labels = ["Time"];

        const numSelectedLaps = getNumberOfSelectedLaps();
        let index = 0;
        for (const [driverNumber, lapNumbers] of selectedLaps) {
            for (const lapNumber of lapNumbers) {
                const data = driverLapData.get(driverNumber).get(lapNumber);
                const count = data.time.length;

                labels.push(`${drivers.get(driverNumber).name} (Lap ${lapNumber})`);
                for (let i = 0; i < count; ++i) {
                    const throttle = new Array(1 + numSelectedLaps).fill(null);
                    const brake = new Array(1 + numSelectedLaps).fill(null);
                    throttle[0] = data.time[i] - data.timeStartLap;
                    brake[0] = data.time[i] - data.timeStartLap;
                    throttle[index + 1] = data.throttle[i];
                    brake[index + 1] = data.brake[i];
                    throttleData.push(throttle);
                    brakeData.push(brake);
                }
                index++;
            }
        }
        const plots = [
            new Dygraph(divThrottle, throttleData, {
                legend: "always",
                title: "Throttle",
                labels: labels,
            }),
            new Dygraph(divBrake, brakeData, {
                legend: "always",
                title: "Brake",
                labels: labels,
            }),
        ];
    }

    function removeAllChildren(parent: HTMLElement) {
        while (parent.lastChild) {
            parent.removeChild(parent.lastChild);
        }
    }

    function getNumberOfSelectedLaps(): number {
        let numSelectedLaps = 0;
        for (const selectedDriverLaps of selectedLaps.values())
            numSelectedLaps += selectedDriverLaps.size;
        return numSelectedLaps;
    }
</script>

<main>
    <div class="plot" id="plot-throttle" />
    <div class="plot" id="plot-brake" />
</main>

<aside>
    <FilePicker on:fileLoaded={onFileLoaded} />

    {#if driverLapData != null}
        <ul>
            {#each [...drivers.values()] as driver}
                <li>{driver.number} - {driver.name}</li>
                {#if driverLapData.has(driver.number)}
                    <ul>
                        {#each [...driverLapData.get(driver.number)] as [lapNumber, _]}
                            <li>
                                Lap {lapNumber}
                                <input
                                    type="checkbox"
                                    on:change={(event) =>
                                        onLapSelectionChange(
                                            driver.number,
                                            lapNumber,
                                            event
                                        )}
                                />
                            </li>
                        {/each}
                    </ul>
                {/if}
            {/each}
        </ul>
    {/if}
</aside>

<style>
    .plot {
        position: relative;
        width: 100% !important;
    }
</style>
