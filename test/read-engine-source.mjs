import {readFile} from 'node:fs/promises';

// Existing Windows workspaces may still have CRLF even after adding .gitattributes.
export async function readEngineSource(){
    return (await readFile(new URL('../index.html',import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
}
