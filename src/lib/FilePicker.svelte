<script lang="ts">
    import { createEventDispatcher, getContext } from "svelte";

    const dispatch = createEventDispatcher();
    const worker: Worker = getContext("worker");

    function onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file: File = input.files.item(0);
        file.arrayBuffer().then((data: ArrayBuffer) => {
            const bytes = new Uint8Array(data);
            const isCompressed = bytes.at(0) === 0x1f && bytes.at(1) === 0x8b; // gzip magic
            if (!isCompressed) {
                dispatch("fileLoaded", bytes);
            } else {
                const onDecompressedBytes = (
                    event: MessageEvent<Uint8Array>
                ) => {
                    const bytesDecompressed = event.data;
                    dispatch("fileLoaded", bytesDecompressed);
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

<input type="file" on:change={onFileSelected} />
