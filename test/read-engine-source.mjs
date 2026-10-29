import {readFile} from 'node:fs/promises';

// Tests inspect a virtual monolith to preserve the original source-level
// assertions. The official page actually loads the same classic game from
// engine/arena-game.js, without a second implementation.
export async function readEngineSource(){
    const [index,game]=await Promise.all([
        readFile(new URL('../index.html',import.meta.url),'utf8'),
        readFile(new URL('../engine/arena-game.js',import.meta.url),'utf8')
    ]);
    const marker='<script src="engine/arena-game.js?v=0.40"></script>';
    if(index.split(marker).length!==2)throw Error('Official classic-game entry changed');
    return index.replace(marker,()=>'<script>'+game+'</script>').replace(/\r\n?/g,'\n');
}
