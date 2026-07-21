import { Memory } from "../memory/memory";
import { webSearch } from "../tools/search";
import { verify } from "../tools/verifier";
import { AtlasResponse } from "../types/atlas";

export class Atlas {

    private memory = new Memory();

    async ask(question:string):Promise<AtlasResponse>{

        const remembered=this.memory.search(question);

        if(remembered.length){

            return{

                answer:remembered[0].answer,

                confidence:1,

                sources:[]

            };

        }

        const search=await webSearch(question);

        const checked=verify(search);

        const answer="Atlas generated answer.";

        this.memory.remember(question,answer);

        return{

            answer,

            confidence:checked.confidence,

            sources:checked.sources

        };

    }

}
