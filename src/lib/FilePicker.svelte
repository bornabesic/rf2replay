<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    function onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file: File = input.files.item(0);
        file.arrayBuffer().then((data: ArrayBuffer) => {
            dispatch("fileLoaded", data);
        });
    }
</script>

<input type="file" on:change={onFileSelected} />
