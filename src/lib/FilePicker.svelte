<script lang="ts">
    import { createEventDispatcher, getContext } from "svelte";

    const dispatch = createEventDispatcher();
    const worker: Worker = getContext("worker");

    let fileInput: HTMLInputElement;

    function onFileSelected() {
        const file: File = fileInput.files.item(0);
        fileInput.disabled = true;

        dispatch("fileSelected");

        file.arrayBuffer().then((data: ArrayBuffer) => {
            const bytes = new Uint8Array(data);
            const isCompressed = bytes.at(0) === 0x1f && bytes.at(1) === 0x8b; // gzip magic
            if (!isCompressed) {
                dispatch("fileLoaded", bytes);
                fileInput.disabled = false;
            } else {
                const onDecompressedBytes = (
                    event: MessageEvent<Uint8Array>
                ) => {
                    const bytesDecompressed = event.data;
                    dispatch("fileLoaded", bytesDecompressed);
                    fileInput.disabled = false;
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

<input type="file" bind:this={fileInput} on:change={onFileSelected} />
