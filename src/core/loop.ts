export interface LoopConfig {

    enabled: boolean;

    maxLoops: number;

    targetScore: number;

    maxNoImprovement: number;

}

export const LOOP: LoopConfig = {

    enabled: false,

    maxLoops: 3,

    targetScore: 95,

    maxNoImprovement: 2,

};
