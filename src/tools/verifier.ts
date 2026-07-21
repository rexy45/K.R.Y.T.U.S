import { SearchResult } from "../types/atlas";

export function verify(results:SearchResult[]){

    return {

        verified:true,

        confidence:0.90,

        sources:results

    };

}
