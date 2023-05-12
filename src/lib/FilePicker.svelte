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

    import { createEventDispatcher, getContext } from "svelte";
    import { FileUploaderButton } from "carbon-components-svelte";

    const dispatch = createEventDispatcher();
    const worker: Worker = getContext("worker");

    let fileInput: FileUploaderButton;
    let files: Array<File>;
    let disabled = false;

    function onFileSelected() {
        const file: File = files[0];
        disabled = true;

        dispatch("fileSelected");

        file.arrayBuffer().then((data: ArrayBuffer) => {
            const bytes = new Uint8Array(data);
            const isCompressed = bytes.at(0) === 0x1f && bytes.at(1) === 0x8b; // gzip magic
            if (!isCompressed) {
                dispatch("fileLoaded", bytes);
                disabled = false;
            } else {
                const onDecompressedBytes = (
                    event: MessageEvent<Uint8Array>
                ) => {
                    const bytesDecompressed = event.data;
                    dispatch("fileLoaded", bytesDecompressed);
                    disabled = false;
                    worker.removeEventListener("message", onDecompressedBytes);
                };

                worker.addEventListener("message", onDecompressedBytes);
                worker.postMessage({
                    type: "decompress",
                    data: bytes,
                });
            }
        });
    }
</script>

<FileUploaderButton
    labelText="Select a replay file"
    bind:this={fileInput}
    bind:files
    bind:disabled
    on:change={onFileSelected}
/>
