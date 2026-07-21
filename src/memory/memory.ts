import { AtlasMemory } from "../types/atlas";

export class Memory {

    private memories: AtlasMemory[] = [];

    remember(question:string, answer:string){

        this.memories.push({
            question,
            answer,
            timestamp:Date.now()
        });

        if(this.memories.length>100){

            this.memories.shift();

        }

    }

    search(query:string){

        return this.memories.filter(x=>

            x.question.toLowerCase().includes(query.toLowerCase())

        );

    }

}
