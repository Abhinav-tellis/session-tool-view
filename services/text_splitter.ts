import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { readFileSync } from 'fs'

export async function textSplitter(){
    try {
        const text = readFileSync('embedtest.txt', 'utf8')

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            separators: ['\n\n', '\n', ' ', ''],
            chunkOverlap: 50,
        })
        const output = await splitter.createDocuments([text])
        
        console.log(`Split text into ${output.length} chunks`)
        return output 
    } catch(err) {
        console.log(err)
        return []
    }
}