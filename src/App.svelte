<script lang="ts">
    import FilePicker from "./lib/FilePicker.svelte";

    // NOTE Firefox does not support import statements in web workers so it only works in the production build
    // https://github.com/vitejs/vite/issues/4586
    import MainWorker from "./worker?worker";
    import { setContext } from "svelte";

    let worker = new MainWorker();
    setContext("worker", worker);

    let drivers = null;
    let driverLapData = null;

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
</script>

<main>
    <FilePicker on:fileLoaded={onFileLoaded} />

    {#if driverLapData != null}
        <ul>
            {#each [...drivers.values()] as driver}
                <li>{driver.number} - {driver.name}</li>
                {#if driver.number in driverLapData}
                    <ul>
                        {#each Object.entries(driverLapData[driver.number]) as [lapNumber, _]}
                            <li>Lap {lapNumber}</li>
                        {/each}
                    </ul>
                {/if}
            {/each}
        </ul>
    {/if}
</main>

<style>
    main {
        color: red;
    }
</style>
