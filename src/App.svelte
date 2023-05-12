<script lang="ts">
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

    import {
        Header,
        Content,
        SideNav,
        SideNavItems,
        SideNavMenu,
        SideNavMenuItem,
        Loading,
        HeaderUtilities,
        Grid,
        Row,
        Column,
        Checkbox,
        ToastNotification,
    } from "carbon-components-svelte";
    import FilePicker from "./lib/FilePicker.svelte";

    // NOTE Firefox does not support import statements in web workers so it only works in the production build
    // https://github.com/vitejs/vite/issues/4586
    import MainWorker from "./worker?worker";
    import { setContext } from "svelte";
    import Dygraph from "dygraphs";

    let isLoading = false;
    let error = null;

    let worker = new MainWorker();
    setContext("worker", worker);

    let drivers = null;
    let driverLapData: Map<number, Map<number, any>> = null;
    const selectedLaps = new Map<number, Set<number>>();

    function onFileLoaded(event: CustomEvent<Uint8Array>) {
        isLoading = false;

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
            error = message.data;
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
        clearPlots();

        const throttleData = [];
        const brakeData = [];
        const labels = ["Time"];

        const numSelectedLaps = getNumberOfSelectedLaps();
        if (numSelectedLaps == 0) return;

        let index = 0;
        for (const [driverNumber, lapNumbers] of selectedLaps) {
            for (const lapNumber of lapNumbers) {
                const data = driverLapData.get(driverNumber).get(lapNumber);
                const count = data.time.length;

                labels.push(
                    `${drivers.get(driverNumber).name} (Lap ${lapNumber})`
                );
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

        const divThrottle = document.getElementById("plot-throttle");
        const divBrake = document.getElementById("plot-brake");
        const plots = [
            new Dygraph(divThrottle, throttleData, {
                legend: "always",
                title: "Throttle",
                labels: labels,
                axisLineColor: "white",
                colorValue: 0.9,
            }),
            new Dygraph(divBrake, brakeData, {
                legend: "always",
                title: "Brake",
                labels: labels,
                axisLineColor: "white",
                colorValue: 0.9,
            }),
        ];
    }

    function clearPlots() {
        const divThrottle = document.getElementById("plot-throttle");
        const divBrake = document.getElementById("plot-brake");
        removeAllChildren(divThrottle);
        removeAllChildren(divBrake);
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

<Header platformName="rF2 Replay">
    <HeaderUtilities>
        <FilePicker
            on:fileLoaded={onFileLoaded}
            on:fileSelected={() => {
                clearPlots();
                isLoading = true;
                error = null;
            }}
        />
    </HeaderUtilities>
</Header>

<Loading active={isLoading} />

{#if driverLapData != null}
    <SideNav isOpen={true}>
        <SideNavItems>
            {#each [...drivers.values()] as driver}
                {#if driverLapData.has(driver.number)}
                    <SideNavMenu text="{driver.number} - {driver.name}">
                        {#each [...driverLapData.get(driver.number)] as [lapNumber, _]}
                            <SideNavMenuItem>
                                <Checkbox
                                    labelText="Lap {lapNumber}"
                                    on:change={(event) =>
                                        onLapSelectionChange(
                                            driver.number,
                                            lapNumber,
                                            event
                                        )}
                                />
                            </SideNavMenuItem>
                        {/each}
                    </SideNavMenu>
                {/if}
            {/each}
        </SideNavItems>
    </SideNav>
{/if}

<Content>
    {#if error != null}
        <ToastNotification
            title="Error"
            subtitle="Could not load the replay file."
            caption={error}
        />
    {/if}

    <Grid noGutter={true}>
        <Row padding={true} noGutter={true}>
            <Column noGutter={true}>
                <div class="plot" id="plot-throttle" />
            </Column>
        </Row>
        <Row padding={true} noGutter={true}>
            <Column noGutter={true}>
                <div class="plot" id="plot-brake" />
            </Column>
        </Row>
    </Grid>
</Content>

<style>
    .plot {
        position: relative;
        width: 100% !important;
    }
</style>
