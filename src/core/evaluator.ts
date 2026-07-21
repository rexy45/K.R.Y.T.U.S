export interface EvaluationResult {

    score: number;

    continueLoop: boolean;

    reason: string;

}

export class Evaluator {

    evaluate(response: string): EvaluationResult {

        let score = 50;

        const reasons: string[] = [];

        if(response.length > 300)
            score += 15;
        else
            reasons.push("Short answer.");

        if(response.includes("```"))
            score += 15;

        if(
            response.includes("#") ||
            response.includes("|") ||
            response.includes("- ")
        )
            score += 10;

        if(
            response.toLowerCase().includes("todo") ||
            response.toLowerCase().includes("placeholder")
        ){

            score -= 30;

            reasons.push("Contains unfinished sections.");

        }

        score = Math.max(
            0,
            Math.min(
                score,
                100
            )
        );

        return {

            score,

            continueLoop: score < 95,

            reason:
                reasons.length
                    ? reasons.join(" ")
                    : "Looks good."

        };

    }

}
