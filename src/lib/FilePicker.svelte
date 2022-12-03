<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { inflate } from "pako";

    const dispatch = createEventDispatcher();

    function onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file: File = input.files.item(0);
        file.arrayBuffer().then((data: ArrayBuffer) => {
            let bytes = new Uint8Array(data);
            const isCompressed = bytes.at(0) === 0x1f && bytes.at(1) === 0x8b; // gzip magic
            if (isCompressed) {
                bytes = inflate(bytes);
            }
            dispatch("fileLoaded", bytes);
        });
    }
</script>

<input type="file" on:change={onFileSelected} />
