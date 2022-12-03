
import { inflate } from "pako";

onmessage = (event: MessageEvent<any>) => {
    const message = event.data;
    if (message.type === "decompress") {
        const bytes: Uint8Array = message.data;
        const bytesDecompressed: Uint8Array = inflate(bytes);
        postMessage(bytesDecompressed);
    }
}
